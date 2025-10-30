function random_select_key() {
	const id_list = Object.keys(key_list);
	const index = Math.floor(Math.random() * id_list.length);
	const id = id_list[index];

	return {
		id: id,
		key: key_list[id]
	};
}

/**
 * テキストを暗号化します(encyrpt関数のラッパー)
 * @param {CryptoKey} key 鍵
 * @param {string} text 入力
 * @returns 
 */
async function encrypt_text(key, text) {
	const encoded = new TextEncoder().encode(input);
	return await encrypt(key, encoded);
}

/**
 * バイト列を暗号化します
 * @param {CryptoKey} key 鍵
 * @param {Uint8Array} byte_list 入力
 * @returns 暗号化済みデータ
 */
async function encrypt(key, byte_list) {
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const encrypt = await crypto.subtle.encrypt({"name": "AES-GCM", iv: iv, tagLength: 128}, key, byte_list);

	return {
		iv: iv,
		encrypt: encrypt
	};
}

/**
 * 復号化し、テキストで返します
 * @param {CryptoKey} key 鍵
 * @param {Uint8Array} iv IV
 * @param {Uint8Array} encrypt_data 暗号化済みデータ
 * @returns 復号化済みデータ
 */
async function decrypt_text(key, iv, encrypt_data) {
	return new TextDecoder().decode(await decrypt(key, iv, encrypt_data));
}

/**
 * 復号化します
 * @param {CryptoKey} key 鍵
 * @param {Uint8Array} iv IV
 * @param {Uint8Array} encrypt_data 暗号化済みデータ
 * @returns 復号化済みデータ
 */
async function decrypt(key, iv, encrypt_data) {
	const decrypt = await crypto.subtle.decrypt({"name": "AES-GCM", iv, tagLength: 128}, key, encrypt_data);
	return new Uint8Array(decrypt);
}