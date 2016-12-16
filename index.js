const {shell} = require('electron')
var fs = require('fs');
var path = require('path');
window.jQuery = window.$ = require('jquery');
require('bootstrap');
var NCMB = require('ncmb');

function authentication(ncmb, userName, password) {
  return new Promise((res, rej) => {
    if (userName && password) {
      ncmb.User.login(userName, password)
        .then(() => {
          res('ログイン成功しました');
        })
        .catch((err) => {
          rej(`ログイン失敗しました。 ${err}`);
        })
    }else {
      res(null);
    }
  });
}

var setMessage = (app, message, type) => {
  app.message = {
    message: message,
    type: `alert-${type}`
  }
  setTimeout(() => {
    app.message = null;
  }, 2000)
};

$(function() {
  var data = {
    ncmb: null,
    message: null
  };
  var ary = ['application_key', 'client_key', 'userName', 'password'];
  for (var i in ary) {
    var key = ary[i];
    data[key] = localStorage.getItem(key);
  }
  
  var app = new Vue({
    el: '#app',
    data: data,
    mounted() {
      if (this.application_key && this.client_key) {
        this.ncmb = new NCMB(this.application_key, this.client_key);
        authentication(this.ncmb, this.userName, this.password)
          .then((msg) => {
            // 認証完了
            if (msg)
              setMessage(app, msg, 'success');
          }, (err) => {
            setMessage(app, err, 'warning');
          });
      }
    },
    methods: {
      // NCMBの管理画面を開きます
      open_mbaas(e) {
        shell.openExternal('https://console.mb.cloud.nifty.com/');
      },
      
      // キーの登録処理
      register_keys(e) {
        e.preventDefault();
        
        // 入力された設定をlocalStorageおよびアプリケーションデータとして設定
        for (var i in ary) {
          var key = ary[i];
          localStorage.setItem(key, e.target[key].value);
          app[key] = e.target[key].value;
        }
        app._mount();
      },
      
      // キーの再設定用
      remove_keys(e) {
        app.ncmb = null;
      },
    },
  });
})
