class Headers:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response["Content-Security-Policy"] = (
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'"
        )
        response["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response["X-Frame-Options"] = "DENY"
        if request.path.startswith("/api/"):
            response["Cache-Control"] = "no-store"
        return response
