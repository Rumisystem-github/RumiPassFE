const ACCOUNT_API = "https://account.rumiserver.com/api/";

const local_storage_key = {
	KeyList: "AES_KEY_LIST"
};

let dialog = new DIALOG_SYSTEM();
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
		data_list: document.getElementById("SITE_VIEWER_DATA_LIST")
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
			item.appendChild(a);
		}
	}
}

async function open_site_viewer(id) {
	//初期化
	mel.site_viewer.data_list.replaceChildren();

	const r = await get_site(id);
	const crypt_key = key_list[r.site.KEY_ID];

	//名前とか
	mel.site_viewer.name.innerText = r.site.NAME;

	//データリストにデータを
	for (let i = 0; i < r.data.length; i++) {
		const data = r.data[i];
		const iv = decode_base64(data.IV);
		const contents_encrypt = decode_base64(data.CONTENTS);
		const contents_plain = await decrypt_text(crypt_key, iv, contents_encrypt);

		let item = document.createElement("DIV");
		item.className = "DATA_ITEM";

		let type_el = document.createElement("DIV");
		type_el.innerText = data.NAME;
		item.appendChild(type_el);

		let contents_el = document.createElement("INPUT")
		contents_el.setAttribute("readonly", "");
		contents_el.value = contents_plain;
		item.appendChild(contents_el);

		mel.site_viewer.data_list.appendChild(item);
	}

	mel.site_viewer.parent.style.display = "block";
}

async function open_site_editor(id) {
	//初期化
	mel.site_editor.parent.dataset.id = id;
	mel.site_editor.data_list.replaceChildren();

	const r = await get_site(id);
	const crypt_key = key_list[r.site.KEY_ID];

	//名前
	mel.site_editor.name.value = r.site.NAME;

	//ホスト名
	mel.site_editor.host.value = r.site.HOST.join("\n");

	//データ
	for (let i = 0; i < r.data.length; i++) {
		const data = r.data[i];
		const iv = decode_base64(data.IV);
		const contents_encrypt = decode_base64(data.CONTENTS);
		const contents_plain = await decrypt_text(crypt_key, iv, contents_encrypt);

		mel.site_editor.data_list.appendChild(gen_site_editor_data_field(data.NAME, contents_plain));
	}

	mel.site_editor.parent.style.display = "block";
}

function site_editor_add_data() {
	mel.site_editor.data_list.appendChild(gen_site_editor_data_field("", ""));
}

function gen_site_editor_data_field(name, text) {
	let tr = document.createElement("TR");

	//タイプ名
	let name_td = document.createElement("TD");
	name_td.className = "NAME";
	tr.appendChild(name_td);

	let name_input = document.createElement("INPUT");
	name_input.value = name;
	name_td.appendChild(name_input);

	//入力欄
	let input_td = document.createElement("TD");
	input_td.className = "CONTENTS";
	tr.appendChild(input_td);

	let input_el = document.createElement("INPUT");
	input_el.value = text;
	input_td.appendChild(input_el);

	//削除ボタン
	let remove_td = document.createElement("TD");
	tr.appendChild(remove_td);

	let remove_button =document.createElement("BUTTON");
	remove_button.innerText = "X";
	remove_button.addEventListener("click", (e)=>{
		tr.remove();
	});
	remove_td.appendChild(remove_button);

	return tr;
}

async function site_editor_apply() {
	const id = mel.site_editor.parent.dataset.id;

	const r = await get_site(id);
	const crypt_key = key_list[r.site.KEY_ID];

	//データ
	let data_list = [];
	const data_field_list = mel.site_editor.data_list.childNodes;
	for (let i = 0; i < data_field_list.length; i++) {
		const el = data_field_list[i];
		const name_el = el.querySelector(".NAME");
		const contents_el = el.querySelector(".CONTENTS");
		if (name_el == null || contents_el == null) continue;

		const name = name_el.childNodes[0].value;
		const contents = contents_el.childNodes[0].value;
		const encrypted = await encrypt_text(crypt_key, contents);
		data_list.push({
			"NAME": name,
			"IV": encode_base64(encrypted.iv),
			"CONTENTS": encode_base64(encrypted.encrypt)
		});
	}
	await edit_site_data(id, data_list);

	//名前
	if (r.site.NAME !== mel.site_editor.name.value) {
		await edit_site_name(id, mel.site_editor.name.value);
	}

	//ホスト名
	await edit_site_host(id, mel.site_editor.host.value.split("\n"));

	mel.site_editor.parent.style.display = "none";
}

/*async function test() {
	const key = key_list["631c3b19-bd7e-4998-b4e1-8df3840832e5"];
	const password = "test4423aiueo____***";
	const encrypt_password = await encrypt_text(key, password);

	await edit_site_data("34a3bdd9-0b46-4424-930d-2fd6a1d4ec82", [
		{
			"TYPE": "PASSWORD",
			"IV": encode_base64(encrypt_password.iv),
			"CONTENTS": encode_base64(encrypt_password.encrypt)
		}
	])
}*/