function doLogin() {
    var loginType = $('input[name="loginType"]:checked').val();

    var credentials = {};
    credentials.username = $('#username').val();
    credentials.password = $('#password').val();
    
    $('#loginButton').prop('disabled', true);
    $("#username").prop('disabled', true);
    $("#password").prop('disabled', true);

    var loginRequest = {loginType: loginType, credentials: credentials};            
    $.ajax({method : 'POST', url : "api/iAssist/login", data : JSON.stringify(loginRequest), contentType:'application/json;charset=utf-8', dataType : 'json'})
        .done(function(data, status, xhr) {
            displayMessage('Login successfull', 'alert-success');
            
            Cookies.set('session', data.session);
            Cookies.set('user', data.user.email);
          
            setTimeout(window.location.replace("/"), 4000);
        })
        .fail(function(xhr, textStatus, errorThrown) {
            var responseData = JSON.parse(xhr.responseText);
            displayMessage(responseData.error, 'alert-danger');
                
            $('#loginButton').prop('disabled', false);
            $("#username").prop('disabled', false);
            $("#password").prop('disabled', false);
    }); 
}

function logout() {
    $.ajax({method: 'POST', url: "api/iAssist/logout", data: JSON.stringify({}), contentType: 'application/json;charset=utf-8'})
        .done(function(data, status, xhr) {
            window.location.replace('/login');
            Cookies.remove('session', { path: '' });
            Cookies.remove('user', { path: '' }); 
            console.log('logout successful');
        })
        .fail(function(xhr, textStatus, errorThrown) {
            console.log('logout error');
        });
}

function displayMessage(msg, msg_class) {
    $('#status_bar').removeClass('hidden alert-danger alert-success');
    $('#status_bar').addClass(msg_class);
    $('#status_bar').html(msg);
}