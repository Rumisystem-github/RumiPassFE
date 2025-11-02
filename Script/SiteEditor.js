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
		if (data.NAME.startsWith("__")) continue;

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

	for (let i = 0; i < r.data.length; i++) {
		if (r.data[i].NAME.startsWith("__")) {
			data_list.push(r.data[i]);
		}
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
