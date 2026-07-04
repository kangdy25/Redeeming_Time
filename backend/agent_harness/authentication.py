from django.contrib.auth import get_user_model
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken


class AgentScopedJWTAuthentication(JWTAuthentication):
    keyword = 'Agent'

    def get_user(self, validated_token):
        if validated_token.get('agent_scope') is not True:
            raise InvalidToken('Agent token must include agent_scope=true.')

        user_id = validated_token.get('user_id')
        if user_id is None:
            raise InvalidToken('Agent token must include a service user_id.')

        user = get_user_model().objects.filter(id=user_id, is_active=True).first()
        if user is None:
            raise InvalidToken('Agent token references an inactive or missing user.')

        user.agent_name = validated_token.get('agent_name', 'unknown-agent')
        return user
