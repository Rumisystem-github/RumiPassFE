const ACCOUNT_API = "https://account.rumiserver.com/api/";

const local_storage_key = {
	KeyList: "AES_KEY_LIST"
};

let dialog = new DIALOG_SYSTEM();
let session = null;
let self_user = null;
let key_list = {};
let mel = {
	setup: {
		parent: document.getElementById("SETUP_DISPLAY"),
		done: {
			parent: document.getElementById("SETUP_DONE"),
			download: document.getElementById("SETUP_DONE_DOWNLOAD")
		},
		import: {
			parent: document.getElementById("SETUP_IMPORT")
		}
	}
};

window.addEventListener("load", async (e)=>{
	let l = null;
	try {
		l = LOAD_WAIT_PRINT("ログイン");
		session = ReadCOOKIE().SESSION;
		if (session != null) {
			self_user = await LOGIN(session);
			if (self_user == false) {
				window.location.href = "/Login?rd=pass";
				return;
			}
		} else {
			window.location.href = "/Login?rd=pass";
			return;
		}
		LOAD_WAIT_STOP(l, "OK");

		//初期設定済みかチェック
		if (localStorage.getItem(local_storage_key.KeyList) == null) {
			//初期設定画面を出す
			//TODO:サーバーにセットアップ済みかをチェックしに行く
			//mel.setup.parent.style.display = "block";

			l = LOAD_WAIT_PRINT("初期設定中...");

			//鍵設定
			await setup_gen_key();

			//ダウンロードボタンを設定する
			mel.setup.done.download.addEventListener("click", async (e)=>{
				await backup_and_download();
				window.location.reload();
			});

			//開く
			mel.setup.parent.style.display = "block";
			mel.setup.done.parent.style.display = "block";

			//ロード画面閉じる
			LOAD_WAIT_STOP(l, "OK");
			close_load();
			return;
		}

		//鍵をロード
		const ls_key_list = JSON.parse(localStorage.getItem(local_storage_key.KeyList));
		const id_list = Object.keys(ls_key_list);
		for (let i = 0; i < id_list.length; i++) {
			const id = id_list[i];

			l = LOAD_WAIT_PRINT("鍵「"+id+"」を読み込み...");

			const key = decode_base64(ls_key_list[id]);
			key_list[id] = await crypto.subtle.importKey("raw", key, {name: "AES-GCM"}, true, ["encrypt", "decrypt"]);

			LOAD_WAIT_STOP(l, "OK");
		}

		close_load();
	} catch(ex) {
		console.error(ex);
		LOAD_WAIT_STOP(l, "FAILED");
	}
});

function encode_base64(input) {
	return btoa(String.fromCharCode(...new Uint8Array(input)));
}

function decode_base64(input) {
	const binary = atob(input);
	const length = binary.length;
	const byte_list = new Uint8Array(length);

	for (let i = 0; i < length; i++) {
		byte_list[i] = binary.charCodeAt(i);
	}

	return byte_list;
}