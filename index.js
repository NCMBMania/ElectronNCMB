const {shell} = require('electron')
var fs = require('fs');
var path = require('path');
window.jQuery = window.$ = require('jquery');
require('bootstrap');
var NCMB = require('ncmb');

// 認証処理を行います
var authentication = (ncmb, userName, password) => {
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

// メッセージを表示して、2秒後に消します
// typeはBootstrapのalertクラスに適用されます
var setMessage = (app, message, type) => {
  app.message = {
    message: message,
    type: `alert-${type}`
  }
  setTimeout(() => {
    app.message = null;
  }, 2000)
};

var checkRole = (ncmb) => {
  var promises = [];
  var user = ncmb.User.getCurrentUser();
  return new Promise((res, rej) => {
    getAllRoles(ncmb)
      .then( roles => {
        for (var i in roles) {
          promises.push(new Promise( (res1, rej1) => {
            let role = roles[i];
            ncmb.User.isBelongTo(role)
              .then( bol => {
                if (bol) {
                  res1(role);
                } else {
                  res1(null);
                }
              })
              .catch(err => {
                res1(null);
              })
          }));
        }
        Promise.all(promises)
          .then((roles) => {
            res(roles.filter( role => {
              return role != null;
            }));
          })
      });
  })
};

var getAllRoles = (ncmb) => {
  var promises = [];
  var ary = ['Administrator', 'Manager'];
  for (i in ary) {
    promises.push(new Promise((res, rej) => {
      ncmb.Role.equalTo("roleName", ary[i])
        .fetch()
        .then(role => {
          res(role);
        })
        .catch(err => {
          rej(err);
        })
    }));  
  };
  return Promise.all(promises);
};

// ユーザが指定したロールに所属しているかチェックします
var extend = (ncmb) => {
  ncmb.User.isBelongTo = function(role) {
    me = ncmb.User.getCurrentUser();
    return new Promise(function(res, rej) {
      ncmb.request({
        path: "/"+ncmb.version+"/users", 
        query: {
          where: JSON.stringify({
            "objectId": me.objectId,
            "$relatedTo":{
              "object":{
                "__type":"Pointer",
                "className":"role",
                "objectId": role.objectId
              },
              "key":"belongUser"
            }
          })
        }
      })
      .then(function(ary) {
        var json = JSON.parse(ary).results;
        res(json.length == 1);
      })
      .catch(function(e) {
        rej(e);
      });
    })
  }
  return ncmb;
}

$(function() {
  // 設定を読み込みます
  var data = {
    ncmb: null,
    roles: [],
    message: null,
    user: null
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
        this.ncmb = extend(new NCMB(this.application_key, this.client_key));
        authentication(this.ncmb, this.userName, this.password)
          .then((msg) => {
            // 認証完了
            if (!msg)
              return;
            app.user = app.ncmb.User.getCurrentUser();
            setMessage(app, msg, 'success');
            checkRole(app.ncmb)
              .then( roles => {
                app.user.roles = roles;
                var msg = `あなたの権限は [${roles.map( role => role.roleName).join(",")}] です`
                setMessage(app, msg, 'success');
              });
          }, (err) => {
            setMessage(app, err, 'warning');
          });
      }
    },
    methods: {
      hasRole(roleName) {
        if (!this.user || !this.user.roles)
          return false;
        return this.user.roles.map( role => role.roleName).indexOf(roleName) > -1
      },
      
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
