import {
	createCipheriv,
	createDecipheriv,
	createHash,
	randomBytes,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export class Encrypter {
	private key: Buffer;

	constructor(secret: string) {
		if (!secret) {
			throw new Error("Encryption secret is required.");
		}

		this.key = createHash("sha256").update(secret).digest();
	}

	encrypt(value: string): string {
		const iv = randomBytes(IV_LENGTH);
		const cipher = createCipheriv(ALGORITHM, this.key, iv);
		const encrypted = Buffer.concat([
			cipher.update(value, "utf8"),
			cipher.final(),
		]);
		const tag = cipher.getAuthTag();
		return Buffer.concat([iv, tag, encrypted]).toString("base64url");
	}

	decrypt(payload: string): string {
		const buffer = Buffer.from(payload, "base64url");
		const iv = buffer.subarray(0, IV_LENGTH);
		const tag = buffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
		const ciphertext = buffer.subarray(IV_LENGTH + TAG_LENGTH);

		const decipher = createDecipheriv(ALGORITHM, this.key, iv);
		decipher.setAuthTag(tag);
		const decrypted = Buffer.concat([
			decipher.update(ciphertext),
			decipher.final(),
		]);
		return decrypted.toString("utf8");
	}
}
