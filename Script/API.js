async function get_site_list() {
	let ajax = await fetch("/api/Site", {
		method: "GET",
		headers: {
			"TOKEN": session
		}
	})
	const result = await ajax.json();
	if (result.STATUS) {
		return result.LIST;
	} else {
		throw new Error(result.ERR + "\n" + result.EX);
	}
}

async function get_site(id) {
	let ajax = await fetch("/api/Site?ID=" + id, {
		method: "GET",
		headers: {
			"TOKEN": session
		}
	})
	const result = await ajax.json();
	if (result.STATUS) {
		return {
			site: result.SITE,
			data: result.DATA
		};
	} else {
		throw new Error(result.ERR + "\n" + result.EX);
	}
}

async function create_site(name, key_id) {
	let ajax = await fetch("/api/Site", {
		method: "POST",
		headers: {
			"TOKEN": session
		},
		body: JSON.stringify({
			"NAME": name,
			"KEY_ID": key_id
		})
	})
	const result = await ajax.json();
	if (result.STATUS) {
		return result.ID;
	} else {
		throw new Error(result.ERR + "\n" + result.EX);
	}
}

async function edit_site_name(id, name) {
	let ajax = await fetch("/api/Site?ID=" + id, {
		method: "PATCH",
		headers: {
			"TOKEN": session
		},
		body: JSON.stringify({
			"NAME": name
		})
	})
	const result = await ajax.json();
	if (!result.STATUS) {
		throw new Error(result.ERR + "\n" + result.EX);
	}
}

async function edit_site_host(id, host) {
	let ajax = await fetch("/api/Site?ID=" + id, {
		method: "PATCH",
		headers: {
			"TOKEN": session
		},
		body: JSON.stringify({
			"HOST": host
		})
	})
	const result = await ajax.json();
	if (!result.STATUS) {
		throw new Error(result.ERR + "\n" + result.EX);
	}
}

async function edit_site_data(id, data) {
	let ajax = await fetch("/api/Site?ID=" + id, {
		method: "PATCH",
		headers: {
			"TOKEN": session
		},
		body: JSON.stringify({
			"DATA": data
		})
	})
	const result = await ajax.json();
	if (!result.STATUS) {
		throw new Error(result.ERR + "\n" + result.EX);
	}
}