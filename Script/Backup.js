async function backup_and_download() {
	let list = {};
	const key_id_list = Object.keys(key_list);
	for (let i = 0; i < key_id_list.length; i++) {
		const id = key_id_list[i];
		list[id] = encode_base64(await crypto.subtle.exportKey("raw", key_list[id]));
	}

	const contents = JSON.stringify(
		{
			"TYPE": "RUMIPASS_BACKUP",
			"VERSION": "1.0",
			"USER_ID": self_user.ID,
			"KEY_LIST": ls_aes
		}
	);
	const blob = new Blob([contents], {type: "text/plain; charset=UTF-8"});
	const url = URL.createObjectURL(blob);

	//Aタグを作って開かせて消し飛ばす
	const a = document.createElement("A");
	a.href = url;
	a.download = self_user.UID + "-RumiPassBackup.json";
	a.click();
	a.remove();

	URL.revokeObjectURL(url);
}