//####Update Actor####
Actor.loop = function(mort){	
	Test.loop.actor(i);
	mort.frameCount++;
	if(mort.frameCount % 25 === 0){ Actor.loop.activeList(mort); }
	if(!mort.active || mort.dead) return;
		
	if(mort.combat){
		if(mort.hp <= 0) Actor.death(mort);
		if(mort.boss) mort.boss.loop();    //custom boss loop
		
		Actor.loop.ability(mort);
		Actor.loop.regen(mort);    
		Actor.loop.status(mort);	
		Actor.loop.boost(mort);
		Actor.loop.summon(mort);
		if(mort.frameCount % 25 === 0){ Actor.loop.attackReceived(mort); }
	}
	if(mort.combat || mort.move){
		Actor.loop.setTarget(mort);  //update Enemy Target
		Actor.loop.input(mort); //simulate enemy key press depending on target 
	}
	if(mort.combat && mort.move) Actor.loop.move.aim(mort); //impact max spd depending on aim
	
	if(mort.move){
		Actor.loop.bumper(mort);   //test if collision with map    
		Actor.loop.move(mort);  	//move the actor
	}
	if(mort.type === 'player'){
		var i = mort.id;
		if(mort.frameCount % 2 === 0){ Draw.loop(i); }    //draw everything and add button
		if(mort.frameCount % 25 === 0){ Actor.loop.friendList(mort); }    //check if any change in friend list
		if(List.main[i].windowList.trade){ Actor.loop.trade(mort); };    
		if(List.main[i].dialogue){ Actor.loop.dialogue(mort); }

		Test.loop.player(i);	
	}
		
}

//{Ability
Actor.loop.ability = function(m){
	var alreadyBoosted = {};
	m.abilityChange.chargeClient = [0,0,0,0,0,0];
	
	for(var i in m.ability){
		var s = m.ability[i]; if(!s) continue;
		
		var charge = m.abilityChange.charge;
		var press = +m.abilityChange.press[i];
		
		if(!alreadyBoosted[s.id]){  //this is because a player can set the same ability to multiple input
			for(var j in s.spd){
				charge[s.id] += m.atkSpd[j] * s.spd[j];
			}
			alreadyBoosted[s.id] = 1;
		}
		m.abilityChange.chargeClient[+i] = charge[s.id] >= s.period ? 1 : charge[s.id] / s.period;
				
		if(press && charge[s.id] >= s.period){
			Actor.performAbility(m,s);
			break;	//1 ability per frame max
		}
	}

}

Actor.performAbility = function(mort,ab,mana,reset){
	//Mana
	if(mana !== false && !Actor.performAbility.resource(mort,ab.cost)) return;
	
	//Charge
	if(reset !== false) Actor.performAbility.resetCharge(mort,ab);
		
	//Do Ability Action (ex: Combat.action.attack)
	applyFunc.key(mort.id,ab.action.func,ab.action.param);
}

Actor.performAbility.resetCharge = function(mort,ab){
	var charge = mort.abilityChange.charge;
	charge[ab.id] = Math.min(charge[ab.id] % ab.period,1);
	
	//Reset the ability and related abilities
	for(var j in ab.reset){	//'attack':0,'support':0.5,'summon':1,'tag':'fire':0.2
		if(j === 'tag'){	//custom tag
			for(var p in ab.reset.tag){
				for(var n in mort.ability){
					if(!mort.ability[n]) continue;
					if(n !== i && mort.ability[n].tag && mort.ability[n].tag.have(p)){
						charge[n] = charge[n] * ab.reset.tag[p];
					}
				}
			}
		} else {	//type
			for(var k in mort.ability){
				if(!mort.ability[k]) continue;
				if(mort.ability[k].type === j){
					charge[k] = charge[k] * ab.reset[j];
				}
			}
		}
	}
}

Actor.performAbility.resource = function(mort,cost){
	for(var j in cost){
		if(cost[j] > mort[j]){ return false;}
	}
	for(var j in cost){mort[j] -= cost[j];}
	return true;		
}

//}

//{Stats
Actor.loop.status = function(mort){
	Actor.loop.status.knock(mort);
	Actor.loop.status.burn(mort);
	Actor.loop.status.bleed(mort);
	Actor.loop.status.confuse(mort);
}

Actor.loop.status.knock = function(mort){
	var status = mort.status.knock.active;
	if(status.time > 0){ 
		mort.spdX = cos(status.angle)*status.magn;
		mort.spdY = sin(status.angle)*status.magn;
		status.time--;
	}
}

Actor.loop.status.confuse = function(mort){
	var status = mort.status.confuse.active;
	if(status.time > 0){
		status.time--;
	} 
}

Actor.loop.status.burn = function(mort){
	var status = mort.status.burn.active;
	if(status.time> 0){
		if(!status.type || status.type === 'hp'){ Actor.changeHp(mort, (1-status.magn) + '%'); }
		if(status.type === 'maxHp'){ Actor.changeHp(mort,-mort.resource.hp.max*status.magn);}
		status.time--;
	}
}

Actor.loop.status.bleed = function(mort){
	var list = mort.status.bleed.active.list;
	for(var i in list){
		Actor.changeHp(mort,-list[i].magn);
		list[i].time--;
		if(list[i].time <= 0){ list.splice(i,1); }
	}
	mort.status.bleed.active.time = list.length;
}

Actor.loop.regen = function(mort){
	for(var i in mort.resource){
		mort[i] += mort.resource[i].regen;
		mort[i] = Math.min(mort[i],mort.resource[i].max);
	}
}

Actor.loop.boost = function(mort,full){
	var array = {'fast':1,'reg':5,'slow':25};
	for(var j in array){
		if(Loop.frameCount % array[j] === 0){
			for(var i in mort.boost[j]){
				if(mort.boost[j][i].timer < 0){ 
					var stat = mort.boost[j][i].stat;
					delete mort.boost.list[stat].name[mort.boost[j][i].name]
					delete mort.boost[j][i]; 
					Actor.update.boost(mort,stat);
				} else {
					mort.boost[j][i].timer -= array[j];
				}
			}
		}
	}
	
	for(var i in mort.boost.toUpdate){
		Actor.update.boost(mort,i);
		delete mort.boost.toUpdate[i];
	}
	
	if(full){for(var i in mort.boost.list){Actor.update.boost(mort,i);}}
}

Actor.loop.summon = function(mort){
    //check if summon child still exist (assume player is the master)
	for(var i in mort.summon){
		for(var j in mort.summon[i].child){
			if(!List.all[j]){ delete mort.summon[i].child[j]; }
		}		
	}
	
	//(assume player is child)
    if(mort.summoned && mort.frameCount % 5 === 0){
		if(!mort.summoned.father || !List.all[mort.summoned.father]){ Actor.remove(mort); return; }
	    
	    //if too far, teleport near master
		if(mort.map != List.all[mort.summoned.father].map || Collision.distancePtPt(mort,List.all[mort.summoned.father]) >= mort.summoned.distance){
			mort.x = List.all[mort.summoned.father].x + Math.random()*5-2;
			mort.y = List.all[mort.summoned.father].y + Math.random()*5-2;
			mort.map = List.all[mort.summoned.father].map;
		}	
		
		mort.summoned.time -= 5;
		if(mort.summoned.time < 0){
			Actor.remove(mort);
		}
	}
}

//}

//{Move
Actor.loop.bumper = function(mort){
	//test collision with map
	mort.x = Math.max(mort.x,50);
	mort.x = Math.min(mort.x,Db.map[Map.getModel(mort.map)].grid.input[0].length*32-50);
	mort.y = Math.max(mort.y,50);
	mort.y = Math.min(mort.y,Db.map[Map.getModel(mort.map)].grid.input.length*32-50);
	
	for(var i = 0 ; i < 4 ; i ++){
		mort.bumper[i] = Collision.PtMap({x:mort.x + mort.bumperBox[i].x,y:mort.y + mort.bumperBox[i].y},mort.map,mort);
	}
}

Actor.loop.move = function(mort){
	if(mort.status && mort.status.confuse.active.time > 0){ var bind = mort.status.confuse.active.input;} else { var bind = [0,1,2,3]; }
	if(mort.bumper[0]){mort.spdX = -Math.abs(mort.spdX*0.5) - 1;} 
	if(mort.bumper[1]){mort.spdY = -Math.abs(mort.spdY*0.5) - 1;}
	if(mort.bumper[2]){mort.spdX = Math.abs(mort.spdX*0.5) + 1;} 
	if(mort.bumper[3]){mort.spdY = Math.abs(mort.spdY*0.5) + 1;} 

	if(mort.moveInput[bind[0]] && !mort.bumper[0] && mort.spdX < mort.maxSpd){mort.spdX += mort.acc;}
	if(mort.moveInput[bind[1]] && !mort.bumper[1] && mort.spdY < mort.maxSpd){mort.spdY += mort.acc;}
	if(mort.moveInput[bind[2]] && !mort.bumper[2] && mort.spdX > -mort.maxSpd){mort.spdX -= mort.acc;}
	if(mort.moveInput[bind[3]] && !mort.bumper[3] && mort.spdY > -mort.maxSpd){mort.spdY -= mort.acc;}	
	
	//Friction + Min Spd
	mort.spdX *= mort.friction;	
	mort.spdY *= mort.friction;
	if (Math.abs(mort.spdX) < 0.1){mort.spdX = 0;}	
	if (Math.abs(mort.spdY) < 0.1){mort.spdY = 0;}
	if(mort.spdX || mort.spdY){ mort.moveAngle = atan2(mort.spdY,mort.spdX); } 
	
	//Calculating New Position
	var dist = Math.pyt(mort.spdY,mort.spdX);
	var amount = Math.ceil(dist/30);
	if(amount >= 2){    //aka could pass thru walls => move step by step and test bumper every time
		//need fix, reason y stuck when too fast
		for(var i = 0 ; i < amount && !mort.bumper[0] && !mort.bumper[1] && !mort.bumper[2] && !mort.bumper[3]  ; i++){
			mort.x += mort.spdX/amount;
			mort.y += mort.spdY/amount;
			Sprite.updateBumper(mort);
		} 
	} else {
		mort.x += mort.spdX;
		mort.y += mort.spdY;
	}
	
}

Actor.loop.move.aim = function (mort){	
	//penalty if looking and moving in opposite direction
	var diffAim = Math.abs(mort.angle - mort.moveAngle);
	if (diffAim > 180){ diffAim = 360 - diffAim;}
	Actor.boost(mort,{'stat':'maxSpd','type':"*",'value':Math.pow((360-diffAim)/360,1.5),'time':2,'name':'Aim'});
}
//}


Actor.loop.activeList = function(mort){
	//Note: Could mix that together
		
	//Test Already in List if they deserve to stay
	for(var j in mort.activeList){		//bug here if List.all[j] is undefined
		if(!List.all[j]){
			delete mort.activeList[j];
			continue;
		}
		if(!ActiveList.test(mort,List.all[j])){
			delete List.all[j].viewedBy[mort.id];
			delete mort.activeList[j];
		}
	}
	
	//Add New Boys
	if(List.map[mort.map]){
		for(var j in List.map[mort.map].list){
			if(ActiveList.test(mort,List.all[j])){
				mort.activeList[j] = 1;
				if(mort.type !== 'player'){ List.all[j].viewedBy[mort.id] = 1;}	//for player, viewedBy is used in send init data
			}
		}
	}
	mort.active = (Object.keys(mort.activeList).length || mort.type == 'player')

}

Actor.loop.trade = function(mort){
	var key = mort.id;
	if(List.main[List.main[key].windowList.trade.trader]){
		List.main[key].windowList.trade.tradeList = List.main[List.main[key].windowList.trade.trader].tradeList;	
		List.main[key].windowList.trade.confirm.other = List.main[List.main[key].windowList.trade.trader].windowList.trade.confirm.self;
	
		if(List.main[key].windowList.trade.confirm.other && List.main[key].windowList.trade.confirm.self){
			tradeItem(key,List.main[key].windowList.trade.trader);
		}
	} else {
		List.main[key].windowList.trade = 0;
	}
}

Actor.loop.dialogue = function(mort){
	//test if player has move away to end dialogue	
	var key = mort.id;
	var dx = List.main[key].dialogueLoc.x;
	var dy = List.main[key].dialogueLoc.y;
	if(!Collision.PtRect({'x':mort.x,'y':mort.y},[dx-100,dx+100,dy-100,dy+100])){
		Dialogue.end(key);
	}


}

Actor.loop.friendList = function(mort){
	var key = mort.id;
	var fl = List.main[key].social.list.friend;
    
	for(var i in fl){
		Chat.send.pm.test(List.all[key].name,i,function(from,to,status){
			if(from) fl[to].online = status;
		});			
	}
}

Actor.loop.attackReceived = function(mort){
	for(var i in mort.attackReceived){
		mort.attackReceived[i] -= 25;
		if(mort.attackReceived[i] <= 0){
			delete mort.attackReceived[i];
		}
	}
}






