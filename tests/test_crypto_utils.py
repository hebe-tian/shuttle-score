import os
import tempfile
from cryptography.fernet import Fernet
from crypto_utils import (
    generate_key, save_key, load_key,
    encrypt_value, decrypt_value, ENC_PREFIX
)


class TestGenerateKey:
    def test_returns_bytes(self):
        key = generate_key()
        assert isinstance(key, bytes)

    def test_valid_fernet_key(self):
        key = generate_key()
        Fernet(key)


class TestSaveAndLoadKey:
    def test_save_and_load(self):
        key = generate_key()
        with tempfile.TemporaryDirectory() as tmpdir:
            path = os.path.join(tmpdir, 'test.key')
            save_key(key, path)
            loaded = load_key(path)
            assert loaded == key

    def test_load_nonexistent(self):
        result = load_key('/nonexistent/path/key.file')
        assert result is None


class TestEncryptDecrypt:
    def test_encrypt_decrypt_roundtrip(self):
        key = generate_key()
        plaintext = 'hello world'
        encrypted = encrypt_value(plaintext, key)
        assert encrypted.startswith(ENC_PREFIX)
        decrypted = decrypt_value(encrypted, key)
        assert decrypted == plaintext

    def test_decrypt_non_encrypted(self):
        key = generate_key()
        result = decrypt_value('plain_value', key)
        assert result == 'plain_value'

    def test_encrypt_has_prefix(self):
        key = generate_key()
        encrypted = encrypt_value('test', key)
        assert encrypted.startswith(ENC_PREFIX)

    def test_unicode_roundtrip(self):
        key = generate_key()
        plaintext = '中文测试 🏸'
        encrypted = encrypt_value(plaintext, key)
        decrypted = decrypt_value(encrypted, key)
        assert decrypted == plaintext
