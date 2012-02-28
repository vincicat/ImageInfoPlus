onmessage = function (event) {
	var imageData = event.data.imageData;
	var overlayData = event.data.overlayData;
	var indexes = event.data.indexes;
	var msg = '[MSG IN OVERLAY] ';
	var len = indexes.length;
	msg += "Indexes: "+len+"; \n";
	for (var i = 0; i < len; i++){
		var idx =  indexes[i];
		//msg += ["Next 4 byte",idx, idx+1, idx+2, idx+3].join(" ") +"\n"
		//if (i == len-1){ console.log(i, cdata.data[idx]); }
		overlayData.data[idx] = 255;
		overlayData.data[idx+1] = 0;
		overlayData.data[idx+2] = 0;
		overlayData.data[idx+3] = 150;
	}

	msg += ["ASSERT: ", overlayData.data[0],overlayData.data[1],overlayData.data[2], overlayData.data[3]].join(" ");
	postMessage({ status: 'complete', overlayData: overlayData, message: msg });
}