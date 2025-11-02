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

async function setup_import_backup() {
	if (mel.setup.import.file.files.length == 0) return;
	const file = mel.setup.import.file.files[0];

	const reader = new FileReader();
	reader.onload = function(e) {
		const text = e.target.result;
		const data = JSON.parse(text);
		if (data["TYPE"] == null || data["TYPE"] !== "RUMIPASS_BACKUP") {
			dialog.DIALOG("ファイルの形式がおかしい");
			return;
		}

		if (data["USER_ID"] != self_user.ID) {
			dialog.DIALOG("違うユーザーのファイルは読み込めません。");
			return;
		}

		//鍵をインポート
		localStorage.setItem(local_storage_key.KeyList, JSON.stringify(data["KEY_LIST"]));

		window.location.reload();
	}
	reader.onerror = function() {
		dialog.DIALOG("ファイルの読み取りに失敗");
	}

	reader.readAsText(file, "UTF-8");
}