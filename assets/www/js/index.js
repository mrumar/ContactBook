ContactBook = function() {
    var self = this,
        people = [],
        db,
        jsonURL = 'http://192.168.10.245:3000/contacts.json',
        ulWrapper = $('#PeopleList'),
        currentPerson = null,
        contactUIelems = {
    		name: $('.contact-header'),
    		phone: $('.contact-phone'),
    		sms: $('.contact-sms'),
    		email: $('.contact-email'),
    		team: $('.contact-team'),
    		phoneTxt: $('.contact-number')
    	},
    	dialogTitle = $('.dialog-title'),
    	dialogText = $('.dialog-text'),
    	saveAll = {
    		flague: false,
    		success: 0,
    		fail: 0,
    		sum: 0
    	}
    
    this.init = function() {  
        self.loadData();
        
        $('.add-to-contacts').on('click', self.addToContacts);
        $('#updateData').on('click', self.updateContacts);
        $('#saveAll').on('click', self.saveAllContacts);
    }

    this.loadData = function() {
    	var wifi = self.isOnWifi(),
    		connected = self.isConnected(),
    		firstRun = !window.localStorage.getItem("SchibstedContactBook"),
    		dbInit = !!window.localStorage.getItem("SchibstedContactBookDBinit");
    	
    	// opens DB or creates one if it didn't exist
    	db = window.openDatabase("SchibstedContactBook", "1.0", "Schibsted Contact Book DB", 200000); 
    	
    	// set flague when app is run for the first time
    	if (firstRun) {
    		window.localStorage.setItem("SchibstedContactBook", "true");
    		self.loadDataFromJson();
    		return false;
    	}
    	
    	if (!wifi && dbInit) {
    		self.loadDataFromDB();
    	} else {
    		self.loadDataFromJson();
    	}   
    	
    }
    
    this.loadDataFromJson = function() {
    	console.log("loading data from json");
    	var xhr = new XMLHttpRequest();
        xhr.open('GET', jsonURL);
        xhr.overrideMimeType("text/plain");
        xhr.onreadystatechange = function () {
        	if (xhr.status != 200) {
        		// failed to fetch data from server
        		self.displayMessage('Error', 'Cannot update data from server.');
	        	console.log('xhr.status: '+xhr.status+', xhr.readyState: '+xhr.readyState)
        		return false;
        	}
	        if (xhr.status == 200 && xhr.readyState == 4) {
	            people = jQuery.parseJSON(xhr.responseText);
	            people = people.file || people;
	            self.saveDataInDB();
	            self.createPeopleList();
	        }
        };
        xhr.send();

    }
    
    this.saveDataInDB = function() {
    	db.transaction(self.updateDB, self.dbError, self.dbSaveSuccess);
    }
    
    this.loadDataFromDB = function() {
    	db.transaction(self.readDB, self.dbError);
    }
    
    this.readDB = function(tx) {
    	console.log("pobieram rekordy z tabeli contacts");
    	tx.executeSql('SELECT * FROM Contacts', [], self.dbReadSuccess, self.dbError);
    }
    
    this.updateDB = function (tx) {
    	var create = '', 
    		i = 0, 
    		len = people.length;
    	
	    create += 'CREATE TABLE IF NOT EXISTS Contacts ('; 
	   	create += 'id INTEGER PRIMARY KEY,';
	   	create += 'firstname VARCHAR(50),';
	   	create += 'lastname VARCHAR(50),';
	   	create += 'team VARCHAR(50),';
	   	create += 'email VARCHAR(100),';
	   	create += 'phone VARCHAR(20)';
	   	create += ')';
    	
	   	tx.executeSql('DROP TABLE IF EXISTS Contacts');
	   	tx.executeSql(create);
    	
    	
    	for(i; i<len; i++) {
    		tx.executeSql('INSERT INTO Contacts(firstname, lastname, team, email, phone) VALUES ("'+people[i].firstname+'", "'+people[i].lastname+'", "'+people[i].team+'", "'+people[i].email+'", "'+people[i].phone+'")');
    	} 
    }
    
	this.dbError = function(err) {
		console.debug("Error processing SQL: "+err.code);
	}
	
	this.dbReadSuccess = function(tx,results) {
		var len = results.rows.length,
			i = 0;
		people = [];
		// populate people array
		for(i; i<len; i++){
			people.push(results.rows.item(i));
		}

		self.createPeopleList();
	}
	this.dbSaveSuccess = function() {
		console.info('success: data saved in databse!');
		if (!window.localStorage.getItem("SchibstedContactBookDBinit")) {
			window.localStorage.setItem("SchibstedContactBookDBinit", "true");
			console.log("pierwszy raz wypelnilem baze");
		}
	}
    this.isOnWifi = function(){
        return (navigator.network.connection.type === Connection.WIFI);
    }
    this.isConnected = function(){
        return (navigator.network.connection.type === Connection.CELL_2G || navigator.network.connection.type === Connection.CELL_3G || navigator.network.connection.type === Connection.CELL_4G || navigator.network.connection.type === Connection.WIFI || navigator.network.connection.type === Connection.ETHERNET);
    }
    this.updateContacts = function() {
    	self.loadDataFromJson();
    }
    this.createPeopleList = function() {
    	var ul = $('<ul data-role="listview"  data-filter-theme="b" data-filter="true" ></ul>'),
    		li,
    		i = 0,
    		len = people.length;
    	
    	for(i; i<len; i++) {
    		li = $('<li data-theme="b"><img  class="ui-li-icon" src="img/person_icon.png" alt="" /><img  class="ui-li-icon" src="img/tocontact_icon.png" style="float:right" alt="" /><a href="#single-contact" data-index="'+i+'" >'+people[i].firstname+' '+people[i].lastname+'</a></li>');
    		ul.append(li);
    		
    	}
    	// delete previous list
    	ulWrapper.off('click');
    	ulWrapper.empty();
    	ulWrapper.append(ul);
    	ulWrapper.find('ul').listview();
    	self.attachListeners();
    }
    this.attachListeners = function(){
    	ulWrapper.on('click', 'a', self.updatePersonPanel);
    }
    this.updatePersonPanel = function(event) {
    	var personId = parseInt(event.target.attributes['data-index'].value);
    	currentPerson = people[personId];
    	
    	contactUIelems.name.text(currentPerson.firstname+' '+currentPerson.lastname);
    	contactUIelems.phone.attr('href', 'tel:'+currentPerson.phone);
    	contactUIelems.phoneTxt.text(currentPerson.phone);
    	contactUIelems.sms.attr('href', 'sms:'+currentPerson.phone);
    	contactUIelems.email.attr('href', 'mailto:'+currentPerson.email);
    	contactUIelems.team.text(currentPerson.team);
    }
    
    this.searchForContact = function(person) {
    	 var options = new ContactFindOptions(),
    	 fields = ["phoneNumbers", "displayName"];
    	 
    	 options.filter = "%"+person.phone;
         navigator.contacts.find(fields, function(contacts) { self.onFindContactSuccess(contacts, person) }, self.onFindContactError, options);
    }
    this.onFindContactSuccess = function(contacts, person) {
    	if (contacts.length === 0) {
    		self.updateContact(null, person);
    		return false;
    	}
    	// found 1 or more contacts with the same phone number
        for (var i=0; i<contacts.length; i++) {
            console.log("znalazlem "+contacts.length+" wynikow = " + contacts[i].phoneNumbers+", displayName: "+contacts[i].displayName+", id: "+contacts[i].id);
            self.updateContact(contacts[i], person);
        }
    }
    this.onFindContactError = function(contactError) {
        console.debug('Cannot search for contact!');
    }
    
    this.addToContacts = function(p){
    	var person = (!p) ? currentPerson : p;
    	
    	if(!person || !navigator.contacts) {
    		self.onSaveError();
    		return false;
    	}
    	
    	self.searchForContact(person);
    }

    // overrides foundContact(s) with data from person object
    this.updateContact = function(foundContact, person){

    	var contactOrganizations = [],
    		contact, 
    		contactName;

    	contact = navigator.contacts.create();
    	
    	if (foundContact !== null) {
    		contact.id = foundContact.id;
    		contact.rawId = foundContact.id;
    	} else {
    		contact.phoneNumbers = [];
            contact.phoneNumbers.push(new ContactField('mobile', person.phone, true));
    	}
    	
        contact.displayName = person.firstname+' '+person.lastname;
        contactName = new ContactName();
        	contactName.givenName = person.firstname;
        	contactName.familyName = person.lastname;
        contact.name = contactName;
        contactOrganizations.push(new ContactOrganization()); 
        contactOrganizations[0].name ="Schibsted Tech Polska";
        contact.organizations = contactOrganizations;
    	contact.note = person.team;
    	contact.emails = [];
    	contact.emails.push(new ContactField('work', person.email, false));
        
        // save
        contact.save(self.onSaveSuccess, self.onSaveError);

    }
  
    this.onSaveSuccess = function(){
    	console.log('saveAll.flaga: '+saveAll.flague);
    	if (!saveAll.flague) {
    		self.displayMessage('Success!', 'Contact was saved.');
    	} else {
    		saveAll.success++;
    		saveAll.sum++;
    		self.onSaveAllResult();
    	}
    }
    this.onSaveError = function(){
    	if(!saveAll.flague) {
    		self.displayMessage('Error', 'Something went wrong. Please try again.');
    	} else {
    		saveAll.fail++;
    		saveAll.sum++;
    		self.onSaveAllResult();
    	}
    }
    this.displayMessage = function(title, msg) {
    	//dialogTitle.text(title);
    	//dialogText.text(msg); 
    	
		$(document).simpledialog2({
     mode: 'blank',
    headerText: title,
	animate: false,
	themeHeader: 'b',
    blankContent :"<h2 data-role='none' >"+msg+"</h2><a rel='close' data-role='button' href='#'>Close</a>"
  });
    }
    this.saveAllContacts = function() {
    	var i = 0,
    		len = people.length;
    	
    	saveAll.flague = true;
    	for (i; i < len; ++i){
    		self.addToContacts(people[i]);
    	}
    }
    this.onSaveAllResult = function() {
    	console.log('saveAll.sum: '+saveAll.sum+' , people.len: '+people.length);
    	if(saveAll.sum !== people.length) {
    		return;
    	}
    	// all contacts iterated:
    	console.log('suma kontaktow: '+saveAll.sum)
    	self.displayMessage('Result', saveAll.success+' contacts saved, '+saveAll.fail+' contacts failed.');
    	saveAll.flague = false;
    	saveAll.sum = 0;
    	saveAll.success = 0;
    	saveAll.fail = 0;
    }
}



function onDeviceReady() { 
	var contactBook = contactBook || new ContactBook();
	$.mobile.listview.prototype.options.filterPlaceholder = "Search Schibsted contact...";
	console.log("device ready");
    contactBook.init();
}

document.addEventListener("deviceready", onDeviceReady, false);







