
var firData;

var savedSearch = "nil";
var numBackspace = 0;

var filterGlobalCore = false;
var filterTechnical = false;
var filterNonTechnical = false;
var minLevel = 1000;
var maxLevel = 4000;
var filterGold = false;
var filterSilver = false;

var tableData = [];
var pageNumber = 0;

var leftPageEnabled = false;
var rightPageEnabled = false;

var firstRun = true;

var ipAddress = "";
var userIDset = false;


function ab(b){
	if (b) {
		return "O";
	}
	return "X";
}

function filter(){
	//console.log("started filter");
	document.getElementById("submitquery").disabled = true;
	setTimeout(function(){document.getElementById("submitquery").disabled = false;}, 700);
	var textParam = null;//retrieveElement("textparam");
	if (!textParam) {textParam = "";}
	var lastSunday = dateOfLastSunday();
	writeData("PrivateStatistics/Searches/" + lastSunday + "/" + Date.now() + " " + $.cookie('userID'), "T: " + ab(filterTechnical) + ", NT: " + ab(filterNonTechnical) + 
		", GC: " + ab(filterGlobalCore) + ", Min: " + (minLevel/1000) + ", Max: " + (maxLevel/1000) + ", SN: " + ab(filterSilver) + ", GN: " + ab(filterGold));

	var datArr = searchDatabaseForSubstring(textParam);
	if (filterGold || filterSilver){
		datArr = datArr.filter(function(e){
			var name = e["profName"];
			if (filterGold){
				for (var i = 0; i < goldNuggets["professors"].length; i++) {
					var firstName = goldNuggets["professors"][i]["first_name"];
					var lastName = goldNuggets["professors"][i]["last_name"];
					if (name.indexOf(firstName) >= 0 && name.indexOf(lastName) >= 0){
						return true;
					} 
				}
			} 
			if (filterSilver){
				for (var i = 0; i < silverNuggets["professors"].length; i++) {
					var firstName = silverNuggets["professors"][i]["first_name"];
					var lastName = silverNuggets["professors"][i]["last_name"];
					if (name.indexOf(firstName) >= 0 && name.indexOf(lastName) >= 0){
						return true;
					} 
				}
			}
			return false;
		});
	} 
	if (filterGlobalCore){
		datArr = datArr.filter(function(e){
			var id = e["id"].split(' ');
			for (var i = 0; i < globalCores.length; i++) {
				var gcID = globalCores[i];
				if (gcID.indexOf(id[0]) >= 0 && gcID.indexOf(id[1]) >= 0){
					return true;
				} 
			}
			return false;
		});
	}
	if (filterTechnical){
		datArr = datArr.filter(function(e){
			var id = e["id"].split(' ');
			return $.inArray(id[0], techs) != -1;
		});
	}
	if (filterNonTechnical){
		datArr = datArr.filter(function(e){
			var id = e["id"].split(' ');
			return $.inArray(id[0], nontechs) != -1;
		});
	}
	if (document.getElementById('levelcheckboxmin').checked) {
		datArr = datArr.filter(function(e){
			var sig = (e["id"].split(' '))[1];
			return Number(sig.charAt(sig.length-4))*1000 >= minLevel;
		});
	}
	if (document.getElementById('levelcheckboxmax').checked) {
		datArr = datArr.filter(function(e){
			var sig = (e["id"].split(' '))[1];
			return Number(sig.charAt(sig.length-4))*1000 <= maxLevel;
		});
	}

	//console.log("Done!");
	datArr.sort(function(a,b) {
		return (a["ar"] < b["ar"]) ? 1 : ((b["ar"] < a["ar"]) ? -1 : 0);} );
		//console.log(datArr);
		setTable(0,datArr);
		$("#searchres").html("<font color=\"grey\"><b>("+ datArr.length +" Results)</b></font>");

		if (datArr.length > 0){
			$("#tableerror").html("");
		} else {
			$("#tableerror").html("<b>No results matched your search</b>");
		}

		return firebase.database().ref().child("Statistics").once('value').then(function(snapshot) {
			if (window.location.protocol == 'https:'){
				var data = snapshot.val();
				var toWrite = data["Search-Queries"];
				writeData("Statistics/Search-Queries",toWrite+1);
			}
		});
	}

	function nextPage() {
		if (rightPageEnabled){
			pageNumber++;
			setTable(pageNumber,tableData);
		}
	}

	function lastPage() {
		if (leftPageEnabled){
			pageNumber--;
			setTable(pageNumber,tableData);
		}
	}

	function resize() { 
		$('.popover').popover('hide')
	}

	function setTable(page,data) {
		var coursesPerPage = 16;

		if (rightPageEnabled = (data.length > coursesPerPage*(page+1))){
			$("#rightarrow").html("<img src=\"assets/rightpage.png\" style=\"height:20px;\">");
		} else {
			$("#rightarrow").html("<img src=\"assets/rightpagedis.png\" style=\"height:20px;\">");
		}
		if (leftPageEnabled = (page != 0)){
			$("#leftarrow").html("<img src=\"assets/leftpage.png\" style=\"height:20px;\">");
		} else {
			$("#leftarrow").html("<img src=\"assets/leftpagedis.png\" style=\"height:20px;\">");
		}
		tableData = data;
		pageNumber = page;
		$("#pagenum").html("Page " + (page+1));
		var str = "<thead>";
		str += "<tr class=\"active\">";
		str += "<th>#</th>";
		str += "<th>Professor</th>";
		str += "<th>Course ID</th>";
		str += "<th>Course Name</th>"
		str += "<th>A-Range</th>"
		str += "</tr>"
		str += "</thead>"
		str += "<tbody>";
		var maxProfLen = 27;
		var maxCourseLen = 35;
		for (var i=page*coursesPerPage; i<coursesPerPage*(page+1); i++){
			if (i < data.length){				
				str += "<tr>";
				str += "<td>" + (i+1) + "</td>";
				if (data[i]["profName"].length < maxProfLen){
					str += "<td>" + data[i]["profName"] + "</td>";
				} else {
					str += "<td>" + data[i]["profName"].substring(0,maxProfLen-2) + "...</td>";
				}
				str += "<td>" + data[i]["id"] + "</td>";
				if (data[i]["courseName"].length < maxCourseLen){
					str += "<td>" + data[i]["courseName"] + "</td>";
				} else {
					str += "<td>" + data[i]["courseName"].substring(0,maxCourseLen-2) + "...</td>";
				}
				var percentageStr = ""
				if ((data[i]["ar"]*100)%100 > 0){
					percentageStr = Math.floor(data[i]["ar"]) + "% &plusmn " + Math.round((data[i]["ar"]*100)%100)
				} else {
					percentageStr = data[i]["ar"]					
				}
				
				var percentageArr = firData[data[i]["id"].split(' ')[0]][data[i]["id"].split(' ')[1]]["Professors"][data[i]["profName"]]
				str += "<td class=\"text-center\" percentageDisplay>" + "<a style=\"color:#3A7FCF\" href=\"#\" data-toggle=\"popover\" data-trigger=\"focus\" data-html=\"true\" title=\"" + "Submissions (" + percentageArr.length + ")" + "\" data-content=\"";

				for (var n = 0; n < percentageArr.length; n++) {
					str += (n+1) + ") " + percentageArr[n]["arange"] + "% | ";
					if ("date" in percentageArr[n]) {
						str += percentageArr[n]["date"].split(' ')[0];
					} else {
						str += "Before Oct. 2016";
					}
					str += "<br>"
				}

				str += "\">" + percentageStr + "%</a>" + "</td>";
				str += "</tr>";
			} else {
				str += "<tr>";
				str += "<td><img src=\"assets/whiteRect.png\" id=\"nuggetimg\"></td>";
				str += "<td></td>";
				str += "<td></td>";
				str += "<td></td>";
				str += "<td></td>";
				str += "</tr>";
			}
		}
		str += "</tbody>";

		$(document).ready(function(){
			$('[data-toggle="popover"]').popover().click(function(e) {
				e.preventDefault();
			});
		});


		document.getElementById('datatable').innerHTML = str;
	}	 


	function cleanStr(str){
		var preoutput = str.trim();
		preoutput = preoutput.toLowerCase();
		var arr = preoutput.split(' ');
		var output = "";
		for (var i=0;i<arr.length;i++){
			if (arr[i].toLowerCase() != "i" && arr[i].toLowerCase() != "ii" && arr[i].toLowerCase() != "iii" && arr[i].toLowerCase() != "iv"
				&& arr[i].toLowerCase() != "i:" && arr[i].toLowerCase() != "ii:" && arr[i].toLowerCase() != "iii:" && arr[i].toLowerCase() != "iv:"){
				output += " " + arr[i].charAt(0).toUpperCase() + arr[i].substring(1);
		} else {
			output += " " + arr[i].toUpperCase();
		}
	}
	return output.trim();
}

$( "#searchbar" ).keydown(function(event) {
	var input = document.getElementById('searchbar');
	var key = event.which;
	if (key == 8 && numBackspace == 0){
		savedSearch = (retrieveElement("searchbar")).trim();
		numBackspace++;
	} else if (key == 8 && numBackspace != 2){
		numBackspace++;
	} else if (key == 8 && numBackspace == 2){
		if (savedSearch.length > 3){
			var lastSunday = dateOfLastSunday();
			writeData("PrivateStatistics/Searches/" + lastSunday + "/" + Date.now() + " " + $.cookie('userID'),savedSearch);
		}
		numBackspace++;
	} else {
		numBackspace = 0;
	}
});

function dateOfLastSunday(){
	var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
	var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
	var now = new Date();
	var day = days[ now.getDay() ];
	var daysAhead = days.indexOf(day);
	var sunday = new Date();
	sunday.setDate(sunday.getDate()-daysAhead);
	sunday.setHours(0,0,0,0);
	return (sunday.getYear()+1900) + " (" + sunday.getWeekNumber() + ") " + months[sunday.getMonth()] + " " + sunday.getDate();
}

Date.prototype.getWeekNumber = function(){
	var d = new Date(+this);
	d.setHours(0,0,0,0);
	d.setDate(d.getDate()+4-(d.getDay()||7));
	return Math.ceil((((d-new Date(d.getFullYear(),0,1))/8.64e7)+1)/7);
};

function searchChange(){
	var searchText = retrieveElement("searchbar")
	if (searchText.length == 0) {
		$("#tableerror").html("");
		setTable(0,[]);
		$("#searchres").html("<font color=\"grey\"><b>Search Results</b></font>");
	} else if (searchText.length < 3){
		$("#tableerror").html("<b>Search must be at least 3 characters long</b>");
		setTable(0,[]);
		$("#searchres").html("<font color=\"grey\"><b>Search Results</b></font>");
	} else {
		var matching = searchDatabaseForSubstring(searchText);
		matching.sort(function(a,b) { return (a["ar"] < b["ar"]) ? 1 : ((b["ar"] < a["ar"]) ? -1 : 0);} );
		setTable(0,matching);
		$("#searchres").html("<font color=\"grey\"><b>("+ matching.length +" Results)</b></font>");
		if (matching.length > 0){
			$("#tableerror").html("");
		} else {
			$("#tableerror").html("<b>No results matched your search</b>");
		}
	}
}

function init(){
	//console.log("Build 289");
	var config = {
		apiKey: "AIzaSyAIJlbre9lk8mbCphNx-mVes6DNP9ezWn4",
		authDomain: "ezacu-website.firebaseapp.com",
		databaseURL: "https://ezacu-website.firebaseio.com",
		projectId: "ezacu-website",
		storageBucket: "ezacu-website.appspot.com",
		messagingSenderId: "230546373564"
	};

	firebase.initializeApp(config);	
	
	document.getElementById("submitquery").disabled = true;

	var ref = firebase.database().ref();
	ref.child("Departments").on("value", function(snapshot) {
		this.firData = snapshot.val();
		if (firstRun){
			document.getElementById("submitquery").disabled = false;
			var datArr = searchDatabaseForSubstring("");
			var profSet = new Set();
			var courseSet = new Set();
			var idSet = new Set();
			for (var i = 0; i < datArr.length; i++) {
				profSet.add(datArr[i]["profName"]);
				courseSet.add(datArr[i]["courseName"]);
				idSet.add(datArr[i]["id"]);
			}

			var array = Array.from(courseSet);
			array.sort();
			var str = "";
			for (var i = 0; i < array.length; i++) {
				str += "<option value=\"" + array[i] + "\">";
			}
			$("#courseNameList").html(str);

			array = Array.from(idSet);
			array.sort();
			str = "";
			for (var i = 0; i < array.length; i++) {
				str += "<option value=\"" + array[i] + "\">";
			}
			$("#courseIdList").html(str);

			array = Array.from(profSet);
			array.sort();
			str = "";
			for (var i = 0; i < array.length; i++) {
				str += "<option value=\"" + array[i] + "\">";
			}
			$("#profNameList").html(str);

			firstRun = false
		}
	});

	ref.child("Z-Message").on("value", function(snapshot) {
		var mes = snapshot.val();
		$("#message").html("<b>" + mes + "</b>");
	});

	window.onresize = resize;

	setTable(0,[]);

	jQuery("button").click(function(e){
	 	//console.log(e.target.id);
	 	switch (e.target.id) {
	 		case "technical":
	 		if (filterTechnical){
	 			document.getElementById("technical").className = "btn btn-lg col-xs-12";
	 		} else {
	 			document.getElementById("technical").className = "btn btn-lg col-xs-12 glowing";
	 		}
	 		filterTechnical = !filterTechnical;
	 		filterNonTechnical = false;
	 		document.getElementById("nontechnical").className = "btn btn-lg col-xs-12 top15";
	 		filterGlobalCore = false;
	 		document.getElementById("globalcore").className = "btn btn-lg col-xs-12 top15";
	 		break;
	 		case "nontechnical":
	 		if (filterNonTechnical){
	 			document.getElementById("nontechnical").className = "btn btn-lg col-xs-12 top15";
	 		} else {
	 			document.getElementById("nontechnical").className = "btn btn-lg col-xs-12 top15 glowing";
	 		}
	 		filterNonTechnical = !filterNonTechnical;
	 		filterTechnical = false;
	 		document.getElementById("technical").className = "btn btn-lg col-xs-12";
	 		filterGlobalCore = false;
	 		document.getElementById("globalcore").className = "btn btn-lg col-xs-12 top15";
	 		break;
	 		case "globalcore":
	 		if (filterGlobalCore){
	 			document.getElementById("globalcore").className = "btn btn-lg col-xs-12 top15";
	 		} else {
	 			document.getElementById("globalcore").className = "btn btn-lg col-xs-12 top15 glowing";
	 		}
	 		filterGlobalCore = !filterGlobalCore;
	 		filterTechnical = false;
	 		document.getElementById("technical").className = "btn btn-lg col-xs-12";
	 		filterNonTechnical = false;
	 		document.getElementById("nontechnical").className = "btn btn-lg col-xs-12 top15";
	 		break;
	 		case "goldnuggetbtn":
	 		case "goldnuggetimg":
	 		if (filterGold){
	 			document.getElementById("goldnuggetbtn").className = "btn btn-lg col-xs-5 col-xs-push-2";
	 		} else {
	 			document.getElementById("goldnuggetbtn").className = "btn btn-lg col-xs-5 col-xs-push-2 glowing";
	 		}
	 		filterGold = !filterGold;
	 		break;
	 		case "silvernuggetbtn":
	 		case "silvernuggetimg":
	 		if (filterSilver){
	 			document.getElementById("silvernuggetbtn").className = "btn btn-lg col-xs-5 col-xs-push-0";
	 		} else {
	 			document.getElementById("silvernuggetbtn").className = "btn btn-lg col-xs-5 col-xs-push-0 glowing";
	 		}
	 		filterSilver = !filterSilver;
	 		break;
	 		default:
	 	}
	 });

	jQuery(".dropBtn").click(function(e){
		e.preventDefault();
		switch (e.target.id) {
			case "onekmin": 
			minLevel = 1000;
			break;
			case "twokmin": 
			minLevel = 2000;
			break;
			case "threekmin": 
			minLevel = 3000;
			break;
			case "fourkmin": 
			minLevel = 4000;
			break;
			case "fivekmin": 
			minLevel = 5000;
			break;
			case "sixkmin": 
			minLevel = 6000;
			break;
			case "onekmax": 
			maxLevel = 1000;
			break;
			case "twokmax": 
			maxLevel = 2000;
			break;
			case "threekmax": 
			maxLevel = 3000;
			break;
			case "fourkmax": 
			maxLevel = 4000;
			break;
			case "fivekmax": 
			maxLevel = 5000;
			break;
			case "sixkmax": 
			maxLevel = 6000;
			break;
			default:
			alert("The target id is: " + e.target.id + ". This shouldn't happen.");

		}
		$("#minCover").html(minLevel + "   <span class=\"caret\"></span>");
		$("#maxCover").html(maxLevel + "   <span class=\"caret\"></span>");
	});

	

	window.addEventListener("beforeunload", function(e){
		var searchBarText = retrieveElement("searchbar");
		if (searchBarText.length > 3){
			var lastSunday = dateOfLastSunday();
			writeData("PrivateStatistics/Searches/" + lastSunday + "/" + Date.now() + " " + $.cookie('userID'),searchBarText);
		}
	}, false);

	return firebase.database().ref().child("Statistics").once('value').then(function(snapshot) {
		var data = snapshot.val();		
		if (window.location.protocol == 'https:'){
			var cookies = $.cookie();
			if ('userID' in cookies && $.cookie('userID') in data["Users"]){
				var currentID = $.cookie('userID');
				console.log("Old user:", currentID);
				var count = data["Users"][currentID];
				writeData("Statistics/Users/" + currentID,count+1);
				if (currentID != "qxyru3" && currentID != "DAXO5F"){
					writeData("Statistics/Visits",data["Visits"]+1);
				}
			} else {
				console.log("New user");	
				var newID = makeid(6);
				$.cookie('userID', newID, { expires: 1000 });
				writeData("Statistics/Users/" + newID,1);
				writeData("Statistics/Visits",data["Visits"]+1);
			}
			userIDset = true;
		} else {
			console.log("Running Locally");
		}
	});
}

function searchDatabaseForSubstring(substring){

	var searchText = substring.toLowerCase();
	var matching = [];

		//console.log("Search text changed: " + searchText);
		var depts = Object.keys(firData);
		for (var i = depts.length - 1; i >= 0; i--) {
			if (searchText.length == 0 || (depts[i].toLowerCase()).indexOf(searchText) >= 0){
				var courseSigs = Object.keys(firData[depts[i]]);
					for (var j = courseSigs.length - 1; j >= 0; j--) {//A single course now
						var courseNameArrNumbers = Object.keys(firData[depts[i]][courseSigs[j]]["Names"]);
						courseNameArrNumbers.sort(function(a,b) {
							var aVar = firData[depts[i]][courseSigs[j]]["Names"][a]["count"];
							var bVar = firData[depts[i]][courseSigs[j]]["Names"][b]["count"];
							return (aVar < bVar) ? 1 : ((bVar < aVar) ? -1 : 0);} );
						var mostPopularCourseName = firData[depts[i]][courseSigs[j]]["Names"][courseNameArrNumbers[0]]["name"];
						var profNames = Object.keys(firData[depts[i]][courseSigs[j]]["Professors"]);
						for (var k = profNames.length - 1; k >= 0; k--) {
							var arangeArr = firData[depts[i]][courseSigs[j]]["Professors"][profNames[k]];
							var averageArange = 0;
							var arArr = [];
							for (var m = arangeArr.length - 1; m >= 0; m--) {
								averageArange += (arangeArr[m]["arange"]/arangeArr.length);
								arArr.push(arangeArr[m]["arange"]);
							}
							var min = Math.min.apply(Math,arArr);
							var max = Math.max.apply(Math,arArr);
							var intAv = Math.round(averageArange);
							var obj = {ar:intAv+(Math.max(intAv-min,max-intAv))*0.01,courseName:mostPopularCourseName,id:depts[i] + " " + courseSigs[j],profName:profNames[k]};
							matching.push(obj);
						}
					}
				} else {
					var courseSigs = Object.keys(firData[depts[i]]);
					for (var j = courseSigs.length - 1; j >= 0; j--) {
						if ((depts[i] + " " + courseSigs[j]).toLowerCase().indexOf(searchText) >= 0){
							var courseNameArrNumbers = Object.keys(firData[depts[i]][courseSigs[j]]["Names"]);
							courseNameArrNumbers.sort(function(a,b) {
								var aVar = firData[depts[i]][courseSigs[j]]["Names"][a]["count"];
								var bVar = firData[depts[i]][courseSigs[j]]["Names"][b]["count"];
								return (aVar < bVar) ? 1 : ((bVar < aVar) ? -1 : 0);} );
							var mostPopularCourseName = firData[depts[i]][courseSigs[j]]["Names"][courseNameArrNumbers[0]]["name"];
							var profNames = Object.keys(firData[depts[i]][courseSigs[j]]["Professors"]);
							for (var k = profNames.length - 1; k >= 0; k--) {
								var arangeArr = firData[depts[i]][courseSigs[j]]["Professors"][profNames[k]];
								var averageArange = 0;
								var arArr = [];
								for (var m = arangeArr.length - 1; m >= 0; m--) {
									averageArange += (arangeArr[m]["arange"]/arangeArr.length);
									arArr.push(arangeArr[m]["arange"]);
								}
								var min = Math.min.apply(Math,arArr);
								var max = Math.max.apply(Math,arArr);
								var intAv = Math.round(averageArange);
								var obj = {ar:intAv+(Math.max(intAv-min,max-intAv))*0.01,courseName:mostPopularCourseName,id:depts[i] + " " + courseSigs[j],profName:profNames[k]};
								matching.push(obj);
							}
						} else {
							var courseNameArrNumbers = Object.keys(firData[depts[i]][courseSigs[j]]["Names"]);
							var foundCourseNameWithSubstring = false;
							for (var n = courseNameArrNumbers.length - 1; n >= 0; n--) {
								if (((firData[depts[i]][courseSigs[j]]["Names"][courseNameArrNumbers[n]]["name"]).toLowerCase()).indexOf(searchText) >= 0){
									foundCourseNameWithSubstring = true;
								}
							}
							courseNameArrNumbers.sort(function(a,b) {
								var aVar = firData[depts[i]][courseSigs[j]]["Names"][a]["count"];
								var bVar = firData[depts[i]][courseSigs[j]]["Names"][b]["count"];
								return (aVar < bVar) ? 1 : ((bVar < aVar) ? -1 : 0);} );
							var mostPopularCourseName = firData[depts[i]][courseSigs[j]]["Names"][courseNameArrNumbers[0]]["name"];
							var profNames = Object.keys(firData[depts[i]][courseSigs[j]]["Professors"]);
							for (var k = profNames.length - 1; k >= 0; k--) {
								if (foundCourseNameWithSubstring || (profNames[k].toLowerCase()).indexOf(searchText) >= 0){
									var arangeArr = firData[depts[i]][courseSigs[j]]["Professors"][profNames[k]];
									var averageArange = 0;
									var arArr = [];
									for (var m = arangeArr.length - 1; m >= 0; m--) {
										averageArange += (arangeArr[m]["arange"]/arangeArr.length);
										arArr.push(arangeArr[m]["arange"]);
									}
									var min = Math.min.apply(Math,arArr);
									var max = Math.max.apply(Math,arArr);
									var intAv = Math.round(averageArange);
									var obj = {ar:intAv+(Math.max(intAv-min,max-intAv))*0.01,courseName:mostPopularCourseName,id:depts[i] + " " + courseSigs[j],profName:profNames[k]};
									matching.push(obj);
								}
							}							
						}
					}
				}
			}			
			return matching;
		}

		$("#searchForm").submit(function() {
			return false;
		});

		$("#filterform").submit(function() {
			return false;
		});








		function submitButtonPressed(){

			var courseID = retrieveElement("course-id");
			
			var splitID = courseID.split(' ');


			var courseName = retrieveElement("course-name");
			var profName = retrieveElement("prof-name");
			var aRange = retrieveElement("a-range");

			if (splitID.length != 2 || (splitID[1].length != 4 && splitID[1].length != 5 && splitID[1].length != 6) || 
				(splitID[0].length != 3 && splitID[0].length != 4)){
				$("#submissionerror").html("Please enter the course ID in the correct format");
			return;
		} 

		if ((courseName.split(' ')).length < 2){
			$("#submissionerror").html("Please enter the course name exactly as it is shown");
			return;
		} 
		if ((profName.split(' ')).length < 2){
			$("#submissionerror").html("Please enter the full name of the professor");
			return;
		} 
		if (aRange.length == 0 || aRange.length > 2 || !($.isNumeric(aRange)) || Number(aRange) < 0 || Number(aRange) > 100){
			$("#submissionerror").html("Please enter the A-Range in the correct format");
			return;
		}

		$("#submissionerror").html("");

		var date = new Date();
		var dateStr = date.toLocaleDateString() + " " + date.toLocaleTimeString();
		submitData(profName,courseID,courseName,aRange,dateStr);

		$("#submitdataform")[0].reset();

		return firebase.database().ref().child("Statistics").once('value').then(function(snapshot) {
			var data = snapshot.val();
			var submissions = data["Submissions"];
			writeData("Statistics/Submissions",submissions+1);
		});
		
	}




	

	function submitData(pname,id,name,ar,datestr) {
		var userIDtoUse = "localUser";
		if (userIDset){
			userIDtoUse = $.cookie('userID');
		}


		var idarr = id.split(' ');
		var dept = idarr[0].toUpperCase();
		var courseSig = idarr[1].toUpperCase();
		var courseName = cleanStr(name);
		var profName = cleanStr(pname);

		var strToWrite = ""+userIDtoUse + ": " + dept + " " + courseSig + " - " + courseName + " | " + profName + " >> (" + ar + "%)";
		writeData("Statistics/Submissions-Verb/" + Date.now(),strToWrite);

     	if (!(firData.hasOwnProperty(dept))){//Dept not found
     		writeData("Departments/" + dept + "/" + courseSig + "/Professors/" + profName,[{arange:ar,date:datestr,contributor:userIDtoUse}]);
     		writeData("Departments/" + dept + "/" + courseSig + "/Names",[{name:courseName,count:1}]);
     		//console.log("#1");
     		return;
     	} 

     	var courses = Object.keys(firData[dept])
     	for (var i = courses.length - 1; i >= 0; i--) {
     		var c = courses[i];
     		if (c.substring(c.length-4) == courseSig.substring(courseSig.length-4)){//Course id IS found
     			var profs = Object.keys(firData[dept][c]["Professors"])
     			var profsWithLev = [];
     			for (var i = profs.length - 1; i >= 0; i--) {
     				var splitProfName = profName.toLowerCase().split(' ');
     				if (splitProfName.length == 2 && profs[i].split(' ').length > 2 && profs[i].toLowerCase().indexOf(splitProfName[0]) != -1 && profs[i].toLowerCase().indexOf(splitProfName[1]) != -1){
     					profsWithLev.push({prof: profs[i],lev:0});
     				} else {
     					profsWithLev.push({prof: profs[i],lev:levDist(profs[i].toLowerCase(),profName.toLowerCase())});
     				}
     			}
     			profsWithLev.sort(function(a,b) {return (a.lev > b.lev) ? 1 : ((b.lev > a.lev) ? -1 : 0);} );
     			if (profsWithLev[0].lev > 4) {
     				writeData("Departments/" + dept + "/" + c + "/Professors/" + profName,[{arange:ar,date:datestr,contributor:userIDtoUse}]);
     			} else {
     				var currentArr = firData[dept][c]["Professors"][profsWithLev[0].prof];
     				currentArr.push({arange:ar,date:datestr,contributor:userIDtoUse});
     				writeData("Departments/" + dept + "/" + c + "/Professors/" + profsWithLev[0].prof,currentArr);
     			}
     			var usedNames = firData[dept][c]["Names"];
     			//console.log("#2");
     			for (var i = usedNames.length - 1; i >= 0; i--) {
     				if (usedNames[i]["name"] == courseName){
     					usedNames[i]["count"] = usedNames[i]["count"]+1;
     					writeData("Departments/" + dept + "/" + c + "/Names",usedNames);
     					return;
     				}
     			}
     			usedNames.push({name:courseName,count:1});
     			writeData("Departments/" + dept + "/" + c + "/Names",usedNames);
     			return;
     		}
     	}
     	//console.log("#3");
     	//Write full path, since the dept exists but not the course
     	writeData("Departments/" + dept + "/" + courseSig + "/Professors/" + profName,[{arange:ar,date:datestr,contributor:userIDtoUse}]);
     	writeData("Departments/" + dept + "/" + courseSig + "/Names",[{name:courseName,count:1}]);

     }


     function retrieveElement(id) {
     	var txtbox = document.getElementById(id);
     	return txtbox.value;
     }

     function writeData(path,obj) {
     	firebase.database().ref().child(path).set(obj);
     }


     function makeid(length)
     {
     	var text = "";
     	var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

     	for( var i=0; i < length; i++ )
     		text += possible.charAt(Math.floor(Math.random() * possible.length));

     	return text;
     }

//Taken from http://stackoverflow.com/a/11958496/5057543
function levDist(s, t) {
    var d = []; //2d matrix

    // Step 1
    var n = s.length;
    var m = t.length;

    if (n == 0) return m;
    if (m == 0) return n;

    //Create an array of arrays in javascript (a descending loop is quicker)
    for (var i = n; i >= 0; i--) d[i] = [];

    // Step 2
for (var i = n; i >= 0; i--) d[i][0] = i;
	for (var j = m; j >= 0; j--) d[0][j] = j;

    // Step 3
for (var i = 1; i <= n; i++) {
	var s_i = s.charAt(i - 1);

        // Step 4
        for (var j = 1; j <= m; j++) {

            //Check the jagged ld total so far
            if (i == j && d[i][j] > 4) return n;

            var t_j = t.charAt(j - 1);
            var cost = (s_i == t_j) ? 0 : 1; // Step 5

            //Calculate the minimum
            var mi = d[i - 1][j] + 1;
            var b = d[i][j - 1] + 1;
            var c = d[i - 1][j - 1] + cost;

            if (b < mi) mi = b;
            if (c < mi) mi = c;

            d[i][j] = mi; // Step 6

            //Damerau transposition
            if (i > 1 && j > 1 && s_i == t.charAt(j - 2) && s.charAt(i - 2) == t_j) {
            	d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + cost);
            }
        }
    }
    // Step 7
    return d[n][m];
}
