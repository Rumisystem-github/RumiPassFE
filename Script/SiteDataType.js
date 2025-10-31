function get_sitedata_type_name(type) {
	switch (type) {
		case "PASSWORD":
			return "パスワード";
		case "TOTPKEY":
			return "TOTP";
		case "SECRETQUESTION1":
			return "秘密の質問1";
		case "SECRETQUESTION2":
			return "秘密の質問2";
		case "SECRETQUESTION3":
			return "秘密の質問3";
		case "SECRETQUESTION4":
			return "秘密の質問4";
		case "SECRETQUESTION5":
			return "秘密の質問5";
		case "SECRETQUESTION6":
			return "秘密の質問6";
		case "SECRETQUESTION7":
			return "秘密の質問7";
		case "SECRETQUESTION8":
			return "秘密の質問8";
		case "SECRETQUESTION9":
			return "秘密の質問9";
		case "SECRETQUESTION10":
			return "秘密の質問10";
		default:
			return "不明";
	}
}