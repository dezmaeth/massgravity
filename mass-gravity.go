package massgravity

import (
	"net/http"
)

func init() {
	http.HandleFunc("/", handle);
}

func handle(w http.ResponseWriter, r *http.Request) {
    http.ServeFile(w, r, "dist/" +  r.URL.Path[1:])
}