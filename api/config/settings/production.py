from .base import *

if DEBUG:
    raise ImproperlyConfigured("Development mode cannot run production settings.")
