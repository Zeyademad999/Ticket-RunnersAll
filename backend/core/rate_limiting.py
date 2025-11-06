"""
Rate limiting middleware and utilities.
"""
from django.core.cache import cache
from django.http import JsonResponse
from rest_framework import status
from rest_framework.response import Response


def rate_limit(key, limit, window):
    """
    Simple rate limiting decorator.
    
    Args:
        key: Cache key prefix
        limit: Maximum number of requests
        window: Time window in seconds
    """
    def decorator(func):
        def wrapper(request, *args, **kwargs):
            # Get client IP or user ID
            if request.user.is_authenticated:
                cache_key = f"{key}_{request.user.id}"
            else:
                from core.utils import get_client_ip
                cache_key = f"{key}_{get_client_ip(request)}"
            
            # Check current count
            current = cache.get(cache_key, 0)
            
            if current >= limit:
                return Response({
                    'error': {
                        'code': 'RATE_LIMIT_EXCEEDED',
                        'message': f'Rate limit exceeded. Maximum {limit} requests per {window} seconds.'
                    }
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)
            
            # Increment count
            cache.set(cache_key, current + 1, window)
            
            return func(request, *args, **kwargs)
        
        return wrapper
    return decorator

