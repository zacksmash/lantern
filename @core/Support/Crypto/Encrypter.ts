import { randomBytes, subtle } from "node:crypto";

type GcmParams = Parameters<typeof subtle.encrypt>[0] & { name: "AES-GCM" };

const IV_LENGTH = 12;

const base64ToBytes = (value: string): Uint8Array => {
	const normalized = value.startsWith("base64:") ? value.slice(7) : value;
	return Buffer.from(normalized, "base64");
};

const bytesToBase64 = (value: Uint8Array): string =>
	Buffer.from(value).toString("base64");

export class Encrypter {
	private readonly key: CryptoKey;

	private constructor(key: CryptoKey) {
		this.key = key;
	}

	static async fromKeyString(key: string): Promise<Encrypter> {
		const bytes = base64ToBytes(key);
		if (bytes.length !== 32) {
			throw new Error("APP_KEY must decode to 32 bytes (base64).");
		}

		const cryptoKey = await subtle.importKey(
			"raw",
			bytes,
			{ name: "AES-GCM" } as GcmParams,
			false,
			["encrypt", "decrypt"],
		);

		return new Encrypter(cryptoKey);
	}

	async encrypt(value: string): Promise<string> {
		const iv = randomBytes(IV_LENGTH);
		const cipher = await subtle.encrypt(
			{ name: "AES-GCM", iv },
			this.key,
			Buffer.from(value, "utf-8"),
		);

		const payload = new Uint8Array(iv.length + cipher.byteLength);
		payload.set(iv, 0);
		payload.set(new Uint8Array(cipher), iv.length);

		return bytesToBase64(payload);
	}

	async decrypt(payload: string): Promise<string> {
		const bytes = base64ToBytes(payload);
		const iv = bytes.slice(0, IV_LENGTH);
		const ciphertext = bytes.slice(IV_LENGTH);

		const result = await subtle.decrypt(
			{ name: "AES-GCM", iv },
			this.key,
			ciphertext,
		);

		return Buffer.from(result).toString("utf-8");
	}
}
