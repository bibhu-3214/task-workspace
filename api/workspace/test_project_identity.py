from django.conf import settings
from django.test import SimpleTestCase


class ProjectIdentityTests(SimpleTestCase):
    def test_renaming_keeps_session_and_csrf_cookie_names_compatible(self):
        namespace = settings.PRODUCT["storageNamespace"]
        self.assertIn(namespace, settings.PRODUCT["legacyProductIds"])
        self.assertEqual(settings.SESSION_COOKIE_NAME, namespace + "_session")
        self.assertEqual(settings.CSRF_COOKIE_NAME, namespace + "_csrf")
