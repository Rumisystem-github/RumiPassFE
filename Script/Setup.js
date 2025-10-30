async function setup_gen_key() {
	//鍵を生成する
	for (let i = 0; i < 10; i++) {
		const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
		key_list[crypto.randomUUID()] = key;
	}

	//AESをローカルストレージへ書き込み
	let ls_aes = {};
	const key_id_list = Object.keys(key_list);
	for (let i = 0; i < key_id_list.length; i++) {
		const id = key_id_list[i];
		ls_aes[id] = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.exportKey("raw", key_list[id]))));
	}
	localStorage.setItem(local_storage_key.KeyList, JSON.stringify(ls_aes));
}