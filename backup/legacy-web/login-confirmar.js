const loginEmail = sessionStorage.getItem("eyedrive.loginEmail");
if (loginEmail) {
  window.location.replace("/login.html?step=code");
} else {
  window.location.replace("/login.html");
}
