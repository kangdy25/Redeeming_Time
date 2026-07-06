from drf_spectacular.extensions import OpenApiAuthenticationExtension


class JWTAuthenticationScheme(OpenApiAuthenticationExtension):
    target_class = 'rest_framework_simplejwt.authentication.JWTAuthentication'
    name = 'BearerJWT'
    priority = 1

    def get_security_definition(self, auto_schema):
        return {
            'type': 'http',
            'scheme': 'bearer',
            'bearerFormat': 'JWT',
            'description': 'JWT using the `Bearer <token>` authorization header.',
        }


class AgentScopedJWTAuthenticationScheme(OpenApiAuthenticationExtension):
    target_class = 'agent_harness.authentication.AgentScopedJWTAuthentication'
    name = 'AgentScopedJWT'
    priority = 1

    def get_security_definition(self, auto_schema):
        return {
            'type': 'apiKey',
            'in': 'header',
            'name': 'Authorization',
            'description': 'Agent-scoped JWT using the `Agent <token>` authorization header.',
        }
