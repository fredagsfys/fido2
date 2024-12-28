package main

import (
	"encoding/json"
	"fido2/m/domain"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"

	"github.com/go-webauthn/webauthn/webauthn"
)

var (
	webauthnInstance *webauthn.WebAuthn
	users            = make(map[string]*domain.User)
	sessionData      = sync.Map{} // Thread-safe storage for session data
)

type Logger interface {
	Printf(format string, v ...interface{})
}

func main() {
	if err := initializeWebAuthn(); err != nil {
		log.Fatalf("Failed to initialize WebAuthn: %v", err)
	}

	staticDir := os.Getenv("STATIC_DIR")
	if staticDir == "" {
		staticDir = "web"
	}
	http.Handle("/", http.FileServer(http.Dir(staticDir)))

	http.HandleFunc("/api/passkey/registerStart", beginRegistration)
	http.HandleFunc("/api/passkey/registerFinish", finishRegistration)
	http.HandleFunc("/api/passkey/loginStart", beginAuthentication)
	http.HandleFunc("/api/passkey/loginFinish", finishAuthentication)

	fmt.Printf("Starting FIDO2 server on :8080")
	http.ListenAndServe(":8080", nil)
}

func initializeWebAuthn() error {
	var err error
	webauthnInstance, err = webauthn.New(&webauthn.Config{
		RPDisplayName: "FIDO2 Example",                   // Display name for the Relying Party
		RPID:          "localhost",                       // Relying Party ID (domain name)
		RPOrigins:     []string{"http://localhost:8080"}, // Relying Party Origin
	})
	return err
}

func beginRegistration(w http.ResponseWriter, r *http.Request) {
	setHeaders(w)

	username, err := getUsername(r)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Username is required."))
		return
	}

	user := getOrCreateUser(username)
	credential, data, err := webauthnInstance.BeginRegistration(user)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Failed to start registration."))
		return
	}

	prettyPrint("Create registration credential", credential)

	sessionData.Store(string(user.WebAuthnID()), data)

	writeJSON(w, credential)
}

func finishRegistration(w http.ResponseWriter, r *http.Request) {
	setHeaders(w)

	username := r.URL.Query().Get("username")
	if username == "" {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Username is required."))
		return
	}

	user := getOrCreateUser(username)
	data, ok := sessionData.Load(string(user.WebAuthnID()))
	if !ok {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Users session data not found."))
		return
	}
	sessionData.Delete(string(user.WebAuthnID()))

	credential, err := webauthnInstance.FinishRegistration(user, *data.(*webauthn.SessionData), r)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Failed to finish registration."))
		return
	}

	prettyPrint("Verified registration credential", credential)

	user.AddCredential(*credential)

	writeJSON(w, map[string]string{"status": "registration successful"})
}

func beginAuthentication(w http.ResponseWriter, r *http.Request) {
	setHeaders(w)

	username, err := getUsername(r)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Username is required."))
		return
	}

	user := getOrCreateUser(username)
	credential, data, err := webauthnInstance.BeginLogin(user)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Failed to start authentication."))
		return
	}
	prettyPrint("Created assertion credential", credential)

	sessionData.Store(string(user.WebAuthnID()), data)

	writeJSON(w, credential)
}

func finishAuthentication(w http.ResponseWriter, r *http.Request) {
	setHeaders(w)

	username := r.URL.Query().Get("username")
	if username == "" {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Username is required."))
		return
	}

	user := getOrCreateUser(username)

	data, ok := sessionData.Load(string(user.WebAuthnID()))
	if !ok {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Users session data not found."))
		return
	}
	sessionData.Delete(string(user.WebAuthnID()))

	credential, err := webauthnInstance.FinishLogin(user, *data.(*webauthn.SessionData), r)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Failed to finish authentication."))
	}

	prettyPrint("Validated credential", credential)

	writeJSON(w, map[string]string{"status": "authentication successful"})
}

func getOrCreateUser(username string) *domain.User {
	if user, exists := users[username]; exists {
		return user
	}

	user := &domain.User{
		ID:          []byte(username), // Unique ID
		Name:        username,
		DisplayName: username,
		Credentials: []webauthn.Credential{},
	}
	users[username] = user
	return user
}

func getUsername(r *http.Request) (string, error) {
	type Username struct {
		Username string `json:"username"`
	}
	var u Username
	if err := json.NewDecoder(r.Body).Decode(&u); err != nil {
		return "", err
	}

	return u.Username, nil
}

func setHeaders(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*") // Use "*" for any origin, or specify a domain
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
}

func writeJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

func prettyPrint(label string, v interface{}) {
	jsonData, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		fmt.Printf("Error marshalling %s: %v", label, err)
		return
	}

	fmt.Printf("\n%s:\n%s", label, string(jsonData))
}
