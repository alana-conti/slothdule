"""Gera o par de chaves VAPID para o Web Push dos lembretes.

Uso: python backend/scripts/generate_vapid_keys.py

Copie as duas linhas para o .env (local) ou para o .env de produção. A
chave privada é segredo: nunca commite. Trocar o par invalida as
inscrições existentes (cada aparelho precisa ativar de novo).
"""

import base64

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def main() -> None:
    key = ec.generate_private_key(ec.SECP256R1())
    private_raw = key.private_numbers().private_value.to_bytes(32, "big")
    public_raw = key.public_key().public_bytes(
        serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint
    )
    print(f"VAPID_PUBLIC_KEY={_b64url(public_raw)}")
    print(f"VAPID_PRIVATE_KEY={_b64url(private_raw)}")


if __name__ == "__main__":
    main()
