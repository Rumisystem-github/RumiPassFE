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
				code: document.getElementById("SITE_VIEWER_TOTP_ENABLE_CODE")
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
	for (let i = 0; i < bit.length; i++) {
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

async function open_site_viewer(id) {
	//初期化
	mel.site_viewer.parent.dataset.id = id;
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

		let item = document.createElement("DETAILS");
		item.className = "DATA_ITEM";

		let name_el = document.createElement("SUMMARY");
		name_el.innerText = data.NAME;
		item.appendChild(name_el);

		let contents_el = document.createElement("INPUT")
		contents_el.setAttribute("readonly", "");
		contents_el.value = contents_plain;
		item.appendChild(contents_el);

		let copy_button = document.createElement("BUTTON");
		copy_button.innerText = "コ";
		copy_button.addEventListener("click", (e)=>{
			if (navigator.clipboard == null) return;
			navigator.clipboard.writeText(contents_plain);
		});
		item.appendChild(copy_button);

		mel.site_viewer.data_list.appendChild(item);
	}

	//TOTP
	if (r.data.some(x=>x.NAME === "__TOTP")) {
		mel.site_viewer.totp.enable.parent.style.display = "block";
		mel.site_viewer.totp.disable.parent.style.display = "none";

		//解読する
		const encrypt_data = r.data.find(x=>x.NAME === "__TOTP");
		const plain_data = await decrypt_text(crypt_key, decode_base64(encrypt_data.IV), decode_base64(encrypt_data.CONTENTS));
		const totp_data = JSON.parse(plain_data);

		//TOTP生成
		let counter = Math.floor(Date.now() / 1000 / totp_data.period);

		//カウントをビッグエンディアンに変換
		const counter_byte = new Uint8Array(8);
		for (let i = 7; i >= 0; i--) {
			counter_byte[i] = counter & 0xFF;
			counter >>= 8;
		}

		//鍵をCryptKeyに変換
		const key = await crypto.subtle.importKey(
			"raw",
			decode_base64(totp_data.key),
			{name: "HMAC", hash:"SHA-1"},
			false,
			["sign"]
		);

		//HMAC計算
		const hmac = new Uint8Array(await crypto.subtle.sign("HMAC", key, counter_byte));

		//うんちもみもみ
		const offset = hmac[hmac.length - 1] & 0x0F;
		const binary =
			((hmac[offset] & 0x7F) << 24)     |
			((hmac[offset + 1] & 0xFF) << 16) |
			((hmac[offset + 2] & 0xFF) << 8)  |
			(hmac[offset + 3] & 0xFF);

		//もんだうんちをきれいにするお！
		const code = (binary % 10 ** totp_data.digits).toString().padStart(totp_data.digits, "0");
		mel.site_viewer.totp.enable.code.innerText = code;
	} else {
		mel.site_viewer.totp.disable.parent.style.display = "block";
		mel.site_viewer.totp.enable.parent.style.display = "none";
	}

	mel.site_viewer.parent.style.display = "block";
}

async function totp_setting() {
	const id = mel.site_viewer.parent.dataset.id;
	const r = await get_site(id);
	const crypt_key = key_list[r.site.KEY_ID];

	const q = await dialog.INPUT("TOTPの鍵またはURLをください。", {TYPE:"TEXT", NAME:""});
	if (q == null || q == "") return;

	let key = null;
	try {
		const url = new URL(q);
		if (url.protocol.toUpperCase() !== "OTPAUTH:" || url.searchParams.get("secret") == null) {
			dialog.DIALOG("不正な入力値");
			return;
		}

		key = url.searchParams.get("secret").toUpperCase();
	} catch(ex) {
		key = q.replace(/[^A-Za-z0-9]/g, "");
		key = key.toUpperCase();
	}

	//Base32をUnit8Array化
	const key_byte = decode_base32(key);

	//データ化して暗号化
	const totp_data = {
		key: encode_base64(key_byte),
		algorithm: "SHA-1",
		digits: 6,
		period: 30
	};
	const encrypt_data = await encrypt_text(crypt_key, JSON.stringify(totp_data));

	//登録
	let data = r.data;
	data.push(
		{
			"NAME": "__TOTP",
			"IV": encode_base64(encrypt_data.iv),
			"CONTENTS": encode_base64(encrypt_data.encrypt)
		}
	);
	await edit_site_data(id, data);
}

async function jump_site_editor() {
	const match = window.location.pathname.match(/\/site\/([A-Za-z0-9-]+)/);
	if (match == null) return;

	const id = match[1];
	rspa.open_url(new URL(`${window.location.protocol}//${window.location.hostname}/edit/${id}`));
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

	rspa.open_url(new URL(`${window.location.protocol}//${window.location.hostname}/site/${id}`));
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