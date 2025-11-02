let totp_current_period = 1;//←0を入れるな
let totp_current_digits = 0;
let totp_current_key = 0;

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
		if (data.NAME.startsWith("__")) continue;

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
		totp_current_period = totp_data.period;
		totp_current_digits = totp_data.digits;

		//鍵をCryptKeyに変換
		totp_current_key = await crypto.subtle.importKey(
			"raw",
			decode_base64(totp_data.key),
			{name: "HMAC", hash:"SHA-1"},
			false,
			["sign"]
		);

		mel.site_viewer.totp.enable.code.innerText = await totp_gen();
	} else {
		mel.site_viewer.totp.disable.parent.style.display = "block";
		mel.site_viewer.totp.enable.parent.style.display = "none";
	}

	mel.site_viewer.parent.style.display = "block";
}

async function totp_gen() {
	//TOTP生成
	let counter = Math.floor(Date.now() / 1000 / totp_current_period);

	//カウントをビッグエンディアンに変換
	const counter_byte = new Uint8Array(8);
	for (let i = 7; i >= 0; i--) {
		counter_byte[i] = counter & 0xFF;
		counter >>= 8;
	}

	//HMAC計算
	const hmac = new Uint8Array(await crypto.subtle.sign("HMAC", totp_current_key, counter_byte));

	//うんちもみもみ
	const offset = hmac[hmac.length - 1] & 0x0F;
	const binary =
		((hmac[offset] & 0x7F) << 24)     |
		((hmac[offset + 1] & 0xFF) << 16) |
		((hmac[offset + 2] & 0xFF) << 8)  |
		(hmac[offset + 3] & 0xFF);

	//もんだうんちをきれいにするお！
	const code = (binary % 10 ** totp_current_digits).toString().padStart(totp_current_digits, "0");
	return code;
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

	await open_site_viewer(id);
}

async function totp_remove() {
	if (!await dialog.INPUT("解除しますか？", {TYPE:"NONE"})) return;

	const id = mel.site_viewer.parent.dataset.id;
	const r = await get_site(id);
	const data = r.data;
	const index = data.findIndex(x=>x.NAME==="__TOTP");
	if (index === -1) return;

	data.splice(index, 1);
	await edit_site_data(id, data);
	await open_site_viewer(id);
}

setInterval(async () => {
	const nokori = totp_current_period - (Math.floor(Date.now() / 1000) % totp_current_period);

	mel.site_viewer.totp.enable.nokori.period.innerText = nokori;
	mel.site_viewer.totp.enable.nokori.progress.value = (nokori / totp_current_period) * 100;

	if (nokori == totp_current_period) {
		mel.site_viewer.totp.enable.code.innerText = await totp_gen();
	}
}, 500);

async function jump_site_editor() {
	const match = window.location.pathname.match(/\/site\/([A-Za-z0-9-]+)/);
	if (match == null) return;

	const id = match[1];
	rspa.open_url(new URL(`${window.location.protocol}//${window.location.hostname}/edit/${id}`));
}