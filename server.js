var express = require('express')
  , app = express(app)
  , server = require('http').createServer(app);

// serve static files from the current directory
app.use(express.static(__dirname));

//we'll keep clients data here
var clients = {};
  
//get EurecaServer class
var Eureca = require('eureca.io')

//create an instance of EurecaServer
var eurecaServer = new Eureca.Server({allow:['setId', 'spawnEnemy', 'kill', 'updateState', 'clientsNum', 'end', 'updateHealth']});

//attach eureca.io to our http server
eurecaServer.attach(server);


//eureca.io provides events to detect clients connect/disconnect

//detect client connection
eurecaServer.onConnect(function (conn) {    
    console.log('New Client id=%s ', conn.id, conn.remoteAddress);
	
	//the getClient method provide a proxy allowing us to call remote client functions
    var remote = eurecaServer.getClient(conn.id);    
	
	//register the client
	clients[conn.id] = {id:conn.id, remote:remote, health:100}

    var player_id = 1;

	//here we call setId (defined in the client side)
	remote.setId(conn.id, player_id);
});

//detect client disconnection
eurecaServer.onDisconnect(function (conn) {    
    console.log('Client disconnected ', conn.id);
	
	var removeId = clients[conn.id].id;
	
	delete clients[conn.id];
	
	for (var c in clients)
	{
		var remote = clients[c].remote;
		
		//here we call kill() method defined in the client side
		remote.kill(conn.id);
	}

    //remove from clients array
    //clients.splice(conn.id, 1);
});

eurecaServer.exports.handshake = function()
{
	for (var c in clients)
	{
		var remote = clients[c].remote;
		for (var cc in clients)
		{		
			//send latest known position
			var x = clients[cc].laststate ? clients[cc].laststate.x:  0;
			var y = clients[cc].laststate ? clients[cc].laststate.y:  0;

			remote.spawnEnemy(clients[cc].id, x, y);		
		}
	}
}

//be exposed to client side
eurecaServer.exports.handleKeys = function (keys) {
	var conn = this.connection;
	var updatedClient = clients[conn.id];
	
	for (var c in clients)
	{
		var remote = clients[c].remote;
		remote.updateState(updatedClient.id, keys);
		
		//keep last known state so we can send it to new connected clients
		clients[c].laststate = keys;
	}
}

//be exposed to client side
eurecaServer.exports.handleHealth = function (id, health) {
    var conn = this.connection;
    //var remote = clients[conn.id].remote;
    clients[id].health = health;

    for (var c in clients)
    {
        var remote = clients[c].remote;
        remote.updateHealth(c, clients[c].health);
    }
}

eurecaServer.exports.clientsNum = function()
{
    var conn = this.connection;
    var remote = clients[conn.id].remote;
    var num = 0;
    for (var c in clients)
    {
        num++;
    }

    //console.log(remote);
    remote.clientsNum(num);
}

eurecaServer.exports.win = function(myId)
{
    for (var c in clients)
    {
        var remote = clients[c].remote;
        remote.end(myId);
    }
}

server.listen(8000);