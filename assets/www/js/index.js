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
    		team: $('.contact-team')
    	},
    	dialogTitle = $('.dialog-title'),
    	dialogText = $('.dialog-text');
    
    this.init = function() {  
        self.loadData();
        
        $('.add-to-contacts').on('click', self.addToContacts);
        $('#updateData').on('click', self.updateContacts);
    }

    this.loadData = function() {
    	var wifi = self.isOnWifi(),
    		firstRun = !window.localStorage.getItem("SchibstedContactBook");
    	
    	// opens DB or creates one if it didn't exist
    	db = window.openDatabase("SchibstedContactBook", "1.0", "Schibsted Contact Book DB", 200000); 
    	// set flague when app is run for the first time
    	
    	if (!wifi && !firstRun) {
    		// load from local DB
    		self.loadDataFromDB();
    	} else {
    		// load from file
    		self.loadDataFromJson();
    	}   
    	
    	if (firstRun) {
    		window.localStorage.setItem("SchibstedContactBook", "true");
    	}
    }
    
    this.loadDataFromJson = function() {
    	console.log("loading data from json");
    	var xhr = new XMLHttpRequest();
        xhr.open('GET', jsonURL);
        xhr.overrideMimeType("text/plain");
        xhr.onreadystatechange = function () {
        	console.log("hurrra - zaladowano jsona: status: "+xhr.status+", readystate: "+xhr.readyState+", response txt: "+xhr.responseText);
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
	}
    this.isOnWifi = function(){
        return (navigator.network.connection.type === Connection.WIFI);
    }
    this.updateContacts = function() {
    	self.loadDataFromJson();
    }
    this.createPeopleList = function() {
    	console.log("buduje liste kontaktow;");
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
    	contactUIelems.sms.attr('href', 'sms:'+currentPerson.phone);
    	contactUIelems.email.attr('href', 'mailto:'+currentPerson.email);
    	contactUIelems.team.text(currentPerson.team);
    }
    
    this.addToContacts = function(){
    	if(!currentPerson || !navigator.contacts) {
    		self.onSaveError();
    		return false;
    	}
    	var contactOrganizations = [],
    		contact, 
    		contactName;

    	contact = navigator.contacts.create();
        contact.displayName = currentPerson.firstname+' '+currentPerson.lastname;
        contact.nickname = currentPerson.firstname+' '+currentPerson.lastname;
        contactName = new ContactName();
        	contactName.givenName = currentPerson.firstname;
        	contactName.familyName = currentPerson.lastname;
        contact.name = contactName;
        contact.phoneNumbers = [];
        contact.phoneNumbers.push(new ContactField('mobile', currentPerson.phone, true));
        contactOrganizations.push(new ContactOrganization()); 
        contactOrganizations[0].name ="Schibsted Tech Polska";
        contact.organizations = contactOrganizations;
    	contact.note = currentPerson.team;
    	contact.emails = [];
    	contact.emails.push(new ContactField('work', currentPerson.email, false));
        
        // save
        contact.save(self.onSaveSuccess, self.onSaveError);

    }
    this.onSaveSuccess = function(){
    	dialogTitle.text('Success!');
    	dialogText.text('Contact was saved.');
    	$.mobile.changePage('#dialog', 'pop', true, true);
    }
    this.onSaveError = function(){
    	dialogTitle.text('Error');
    	dialogText.text('Something went wrong. Please try again.');
    	//$.mobile.changePage('#dialog', 'pop', true, true);
    	 $.mobile.changePage('#dialog', {transition: 'pop', role: 'dialog'});   
    }
}

function onDeviceReady() { 
	var contactBook = contactBook || new ContactBook();
	$.mobile.listview.prototype.options.filterPlaceholder = "Search Schibsted contact...";
	
    contactBook.init();
}

document.addEventListener("deviceready", onDeviceReady, false);










