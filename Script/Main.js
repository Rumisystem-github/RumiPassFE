const ACCOUNT_API = "https://account.rumiserver.com/api/";

const local_storage_key = {
	KeyList: "AES_KEY_LIST"
};

let dialog = new DIALOG_SYSTEM();
let rspa = new RSPA();
let session = null;
let self_user = null;
let key_list = {};
let site_list = {};

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
	},
	site_dir_list: document.getElementById("SITE_DIR_LIST"),
	site_viewer: {
		parent: document.getElementById("SITE_VIEWER"),
		name: document.getElementById("SITE_VIEWER_NAME"),

		data_list: document.getElementById("SITE_VIEWER_DATA_LIST"),
		totp: {
			parent: document.getElementById("SITE_VIEWER_TOTP"),
			enable: {
				parent: document.getElementById("SITE_VIEWER_TOTP_ENABLE"),
				code: document.getElementById("SITE_VIEWER_TOTP_ENABLE_CODE"),
				nokori: {
					period: document.getElementById("SITE_VIEWER_TOTP_ENABLE_NOKRI_PERIOD"),
					progress: document.getElementById("SITE_VIEWER_TOTP_ENABLE_NOKRI_PROGRESS"),
				}
			},
			disable: {
				parent: document.getElementById("SITE_VIEWER_TOTP_DISABLE")
			}
		}
	},
	site_editor: {
		parent: document.getElementById("SITE_EDITOR"),
		name: document.getElementById("SITE_EDITOR_NAME"),
		host: document.getElementById("SITE_EDITOR_HOST"),
		data_list: document.getElementById("SITE_EDITOR_DATA_LIST")
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

		//サイト一覧をロード
		l = LOAD_WAIT_PRINT("サイト一覧をロード中");
		await reload_site_list();
		refresh_site_list();
		LOAD_WAIT_STOP(l, "OK");

		close_load();

		rspa.ready();
	} catch(ex) {
		console.error(ex);
		LOAD_WAIT_STOP(l, "FAILED");
	}
});

rspa.add_page_change_event_listener((e)=>{
	mel.site_viewer.parent.style.display = "none";
	mel.site_editor.parent.style.display = "none";
});

rspa.set_endpoint("/", ()=>{
	console.log("/");
});


rspa.set_endpoint("/site/:ID", (e)=>{
	if (e.param.ID == null || e.param.ID == "") return;

	open_site_viewer(e.param.ID);
});

rspa.set_endpoint("/edit/:ID", (e)=>{
	if (e.param.ID == null || e.param.ID == "") return;

	open_site_editor(e.param.ID);
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

function decode_base32(input) {
	const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
	let bit = "";
	for (let i = 0; i < input.length; i++) {
		const char = input.charAt(i);
		const val = alphabet.indexOf(char);
		if (val === -1) continue;
		bit += val.toString(2).padStart(5, "0");
	}

	const byte_list = [];
	for (let i = 0; i < bit.length; i += 8) {
		byte_list.push(parseInt(bit.substring(i, i + 8), 2));
	}

	return new Uint8Array(byte_list);
}

async function create_site_button() {
	const q = await dialog.INPUT("サイトを追加", {TYPE:"TEXT", "NAME":"名前"});
	if (q == null) return;
	if (q == "") return;

	//作成
	await create_site(q, random_select_key().id);

	//リロード
	await reload_site_list();
	refresh_site_list();
}

async function reload_site_list() {
	site_list["master"] = await get_site_list();
}

function refresh_site_list() {
	mel.site_dir_list.replaceChildren();

	const dir_list = Object.keys(site_list);
	for (let i = 0; i < dir_list.length; i++) {
		let dir = document.createElement("DETAILS");
		dir.setAttribute("open", "");
		mel.site_dir_list.appendChild(dir);

		let dir_name = document.createElement("SUMMARY");
		dir_name.innerText = dir_list[i];
		dir.appendChild(dir_name);

		let list = document.createElement("DIV");
		list.className = "SITE_LIST";
		dir.appendChild(list);

		for (let j = 0; j < site_list[dir_list[i]].length; j++) {
			const site = site_list[dir_list[i]][j];

			let item = document.createElement("DIV");
			item.className = "SITE_ITEM";
			item.dataset.id = site.ID;
			list.appendChild(item);

			let a = document.createElement("A");
			a.innerText = site.NAME;
			a.href = `/site/${site.ID}`;
			item.appendChild(a);
		}
	}
}
