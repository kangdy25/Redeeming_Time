class AgentRequestMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.is_agent_request = request.headers.get('Authorization', '').startswith('Agent ')
        return self.get_response(request)
