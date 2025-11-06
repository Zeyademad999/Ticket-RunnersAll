"""
Custom authentication for Organizer Portal.
"""
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from users.models import Organizer


class OrganizerJWTAuthentication(JWTAuthentication):
    """
    Custom JWT authentication that sets organizer on request.
    """
    
    def authenticate(self, request):
        header = self.get_header(request)
        if header is None:
            return None
        
        raw_token = self.get_raw_token(header)
        if raw_token is None:
            return None
        
        validated_token = self.get_validated_token(raw_token)
        
        # Get organizer_id from token
        organizer_id = validated_token.get('organizer_id')
        if not organizer_id:
            raise InvalidToken('Token does not contain organizer_id')
        
        try:
            organizer = Organizer.objects.get(id=organizer_id)
        except Organizer.DoesNotExist:
            raise InvalidToken('Organizer not found')
        
        # Set organizer on request
        request.organizer = organizer
        
        return (None, validated_token)  # Return None for user, token for validation

