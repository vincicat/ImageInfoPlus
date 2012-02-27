onmessage = function (event) {
	var color_map = event.data.colorMap;
	var color_index = event.data.colorIndex;
	var data_map = event.data.imageData;
	var data = data_map.data;

	var hex = '';
	for ( var i = 0, r = -1, g = -1, b = -1, a = -1; i < data.length; i += 4){
		r = i;
		g = i+1;
		b = i+2;
		a = i+3; 
		hex = [data[r],data[g],data[b],data[a]].join(",");
		if(!color_map.hasOwnProperty(hex)){  
			color_index.push(hex);
			color_map[hex] = []; 
		} 
		color_map[hex].push(i);
	}
	  postMessage({ status: 'complete', colorMap: color_map, colorIndex: color_index });
};