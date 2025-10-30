_LOADING_EL = document.getElementById("LOADING_DISPLAY_LOG");
const __LOADING_PAGE = LOAD_WAIT_PRINT("ページを読み込み中");

function close_load() {
	document.getElementById("LOADING_DISPLAY").remove();
}

window.addEventListener("load", (E)=>{
	LOAD_WAIT_STOP(__LOADING_PAGE, "OK");
});