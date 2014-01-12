//############################################

var gameStarted = false;
var key = 0;

List = {
	all:{},		//EVERYTHING (player id refers to mortal)
	mortal:{},	//all mortals (player,enemy)
	bullet:{},	//all bullet
	anim:{},	//all anim
	strike:{},	//all strike
	group:{},	//all enemy group
	drop:{},	//all drop
	anim:{},	//all animation
	main:{},	//all List.main of player. (player id) List.main[id].something on server => window.something on client
	map:{},		//all maps including instance 
	socket:{},	//all socket (player id)
	btn:{},		//all buttons
	ctx:{},		//all of canvas (window,popup,stage)
	sfx:{}, 	//all sfx
};

Db = {	//local compilation of information so server doesnt send many times the same info
	equip:{},
	ability:{},
	item:{},
};  



//############################################

//Set the init values from Main.template.
(function(){ 
	main = {};
	var m = Main.template();
	for(var i in m) main[i] = m[i];
})();


//Log In
Sign = {};
Sign.in = function(){
	var user = $("#user")[0].value;
	var pass = $("#pass")[0].value;
	socket.emit('signIn', { 'username': user,'password': pass });
}

Sign.up = function (){
	var user = $("#user")[0].value;
	var pass = $("#pass")[0].value;
	if(user && pass){ socket.emit('signUp', { 'username': user,'password': pass }); }
}

Sign.log = function(text){
	$("#logInfo")[0].innerHTML = text;	
}


socket.on('signIn', function (data) {
	if(data.success){ id = data.key; cloud9 = data.cloud9; Init.game(data.data);  }
	else { Sign.log(data.message);  } 	
});

socket.on('signUp', function (data) {
	Sign.log(data.message);
});



//############################################


//Init
Init.game = function (data) {
	console.log('data',data);
	$("#signDiv")[0].style.display = "none"; 	//remove enter user and psw
	$("#gameDiv")[0].style.display = "inline";  //show game
	
	Init.game.main(data);
	Init.game.other(data);
	
	//Add Canvas. param2 = z-index
	addCanvas('stage','stage',-10);
	addCanvas('win','windowCanvas',10);
	addCanvas('passiveGrid','passiveGridCanvas',11);
	addCanvas('pop','popCanvas',30);
	
	html.chat.text.innerHTML = 'Welcome!';
	html.pm.text.innerHTML = '<br>'
	
	for(var i in main.social.message.chat){Chat.receive(main.social.message.chat[i]);}	main.social.message.chat = [];   //for offline pm
	
	
	Init.db.stat();
	Init.db.sprite();
	Init.db.anim();
	Init.db.sfx();
	Init.db.map();
	Init.mortal();
	Init.db.quest();
	Init.db.customBoost();
	//initAbilityModDb();   //need fixing
	Img.preload(Img.preloader,function(){   //load images
		Init.game.player(data);
		console.log('player',player);
		gameStarted = true;
		setInterval(Loop,40);
		socket.emit('clientReady',1); 
		if(cloud9) { Chat.add('Warning, you are running under cloud9 servers. You may experience intense lagging. Downloading the project and running it locally is recommended.');}	
	});
}

Init.game.main = function(data){
	for(var i in data.main){ main[i] = data.main[i]; }    //set init values sent by server
}
Init.game.player = function(data){    //use data sent from server and default to create the player
	player = Mortal.template('player');
	for(var i in data.player){ player[i] = data.player[i]; }
	$("#chatUserName")[0].innerHTML = player.name + ': '; 
}
Init.game.other = function(data){    //use data sent from server and default to create the player
	Db.passive = data.other.passive.db;
	delete data.other.passive.db;
	for(var i in data.other.passive) Db.passive[i] = data.other.passive[i];	
}
//To add a canvas to the game
addCanvas = function(name,id,z){
	var cv = document.createElement("canvas");
	cv.id = id;
	cv.width = Cst.WIDTH;
	cv.height = Cst.HEIGHT;
	cv.style.border = '1px solid #000000';
	cv.style.position = 'absolute';
	cv.style.left = '0px';
	cv.style.top = '0px';
	cv.style.zIndex = z;
	if(z > 0) cv.style.pointerEvents = "none";
	
	cv.draggable = false;
	cv.onmousedown = function(e) {e.preventDefault();	return false; };
	$("#canvasDiv")[0].appendChild(cv);
	
	List.ctx[name] = cv.getContext("2d");
	List.ctx[name].font = '20px Monaco';
	List.ctx[name].fillStyle = 'black';
	List.ctx[name].textAlign = 'left';
	List.ctx[name].textBaseline = 'top';
	List.ctx[name].save();
}



 
 



socket.on('warning', function (message) {
	warningText.innerHTML = '<font color="red">' + message + '</font>';
});

//Help aka documentation. Called once at start of game. wiki-like parser
Init.help = function(data){
	for(var i = 0 ; i < data.length ; i++){
		
		//Link
		if(data[i] == '[' && data[i+1] == '['){
			var start = i;
			for(var j = start; j < data.length ; j++){
				if(data[j] == ']' && data[j+1] == ']'){
					var tag = data.slice(start+2,j);
					data = data.replaceAll(
					'\\[\\[' + tag + '\\]\\]',
					'<helpLink onclick="Help.update(\'' + tag + '\')" >' + tag + '</helpLink>'
					);
					break;
				}
			}
		}
		
		//Title 
		if(data[i] == '{' && data[i+1] == '{'){
			var start = i;
			for(var j = start; j < data.length ; j++){
				if(data[j] == '}' && data[j+1] == '}'){
					var end = j+1;
					var tag = data.slice(start+2,end-1);
					data = data.replaceAll(
					'\\{\\{' + tag + '\\}\\}',
					'<br><br><helpTag id="HELP' + tag + '" >' + tag + '</helpTag><br>'
					);
					break;
				}
			}
		}
	}
	return data;
}


