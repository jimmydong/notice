/**
 * 用户通知机制
 * by jimmy.dong@gmail.com 2012.10.09
 */
﻿var fs 		= require('fs');
var path 	= require('path');
var http 	= require('http');
var jdlog = function(message){
	console.log(message);
}
//通用HTTP服务
var server = http.createServer(function (request, response) {
    var filePath = '.' + request.url;
    if (filePath == './')
        filePath = './index.html';
    jdlog(" ...... load static page:" + filePath);
     
    fs.exists(filePath, function(exists) {
        if (exists) {
            fs.readFile(filePath, function(error, content) {
                if (error) {
                    response.writeHead(500);
                    response.end();
                }
                else {
                    response.writeHead(200, { 'Content-Type': 'text/html' });
                    response.end(content, 'utf-8');
                }
            });
        }
        else {
            response.writeHead(404);
            response.end();
        }
    });
     
}).listen(8888);
jdlog('Server running at port:8888');

//nowjs聊天室基础上改进
var nowjs = require("now");
var $ = require('jquery');
var everyone = nowjs.initialize(server);
var userNames = new Array();
var userGroup = new Array();

everyone.connected(function(){
  //通知客户端已经联通
  this.now.hello('connect server ready');
});

everyone.now.userInit = function(){
  jdlog("Init user: " + this.now.name + " ,id: " + this.user.clientId);
  //登记ID - 用户名
  userNames[this.user.clientId] = this.now.name;  
  
  //记录组信息
  t = userGroup[this.now.name] = nowjs.getGroup(this.now.name);
  t.addUser(this.user.clientId);
  t.count(function(cnt){jdlog("open windows number:" + cnt);});
  refreshUserList();

  everyone.now.hello(this.now.name + ' is online!');
}

everyone.disconnected(function(){
  jdlog("Left: " + this.now.name);
  uname = this.now.name;
  delete userNames[this.user.clientId];
  t = nowjs.getGroup(this.now.name);
  t.count(function(cnt){
  	if(cnt == 0){
  		//用户已关闭所有窗口，清理用户信息
  		delete userGroup[uname];
  		everyone.now.hello(uname + ' is gone!');
  	}
  });
  refreshUserList();
});

everyone.now.distributeMessage = function(towho, message){
	fromwho = this.now.name;
	if(towho == 'all'){
		//send message to all people
		everyone.now.hello(message);
		everyone.now.receiveMessage(fromwho, '[Broadcast]' + message);
	}else{
		//send message to somebody
		if(towho in userGroup){
			userGroup[towho].getUsers(function(users){
				for (var i = 0; i < users.length; i++){
					clientId = users[i];
					jdlog('get user: ' + clientId);
					nowjs.getClient(clientId, function(){this.now.receiveMessage(fromwho, message)});
				}
			});
		}else{
			jdlog('warning: a message with invalid user: ' + towho);
		}
	}
};

function refreshUserList(){
		var userString = "<option value='all'>all</option>";
		for(var name in userGroup){
			userString = userString + "<option value='" + name + "'>" + name + "</option>";
		};
  	everyone.now.receiveList(userString);
}