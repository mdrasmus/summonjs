

function addEventListener(obj, event, event2, callback)
{
    if (obj.addEventListener && event) {
	obj.addEventListener(event, callback, false);
    } else if (event2)
	obj.attachEvent(event2, callback);
}



// Event handler for mouse wheel event.
function calcMouseWheelDelta(event){
    var delta = 0;
    if (!event) /* For IE. */
        event = window.event;
    if (event.wheelDelta) { /* IE/Opera. */
        delta = event.wheelDelta/120;
	
        // In Opera 9, delta differs in sign as compared to IE.
        if (window.opera)
            delta = -delta;
    } else if (event.detail) { /** Mozilla case. */
        // In Mozilla, sign of delta is different than in IE.
        delta = -event.detail;
    }
    return delta;
}





// create the Summon namespace
var Summon = Summon || {


Camera: function Camera()
{
    this.trans = [0, 0];
    this.zoom = [1, 1];
    this.focus = [0, 0];
},


Canvas: function Canvas(canvas)
{
    var that = this;
    var c = canvas.getContext("2d");
    var camera = new Summon.Camera();

    // mouse info
    var mouseState = "up";
    var mousePt = [0, 0];

    // models
    this.world = ["group"];


    // event handlers
    function test(e)
    {
        x = e.clientX - canvas.offsetLeft;
        y = e.clientY - canvas.offsetTop;
	//that.focus(x, y);

	console.log(camera.trans);
	console.log(camera.focus);

	that.draw();
    }


    function mouseMove(e)
    {
	if (mouseState == "down") {
            x = e.clientX - canvas.offsetLeft;
            y = e.clientY - canvas.offsetTop;
	    dx = x - mousePt[0];
	    dy = y - mousePt[1];
	    mousePt = [x, y];
	    camera.trans[0] += dx;
	    camera.trans[1] += dy;
	    that.draw();
	}
    }

    function mouseDown(e)
    {
        x = e.clientX - canvas.offsetLeft;
        y = e.clientY - canvas.offsetTop;

	mouseState = "down";
	mousePt = [x, y];
    }

    function mouseUp(e)
    {
	mouseState = "up";
    }


    function mouseWheel(e)
    {
	delta = calcMouseWheelDelta(e);

	if (delta) {
            x = e.clientX - canvas.offsetLeft;
            y = e.clientY - canvas.offsetTop;
	    pt = windowToWorld(x, y);
	    that.focus(pt[0], pt[1]);

	    var zoom = 1.0;
	    if (delta > 0)
		zoom = Math.pow(1.1, delta);
	    else
		zoom = 1.0 / Math.pow(1.1, -delta);

	    if (e.shiftKey)
		that.zoom(1.0, zoom);
	    else if (e.ctrlKey)
		that.zoom(zoom, 1.0);
	    else
		that.zoom(zoom, zoom);
	    that.draw();
	}

        // Prevent default actions caused by mouse wheel.
        if (e.preventDefault)
            e.preventDefault();
	e.returnValue = false;
    }

    
    //======================================================================
    
    function windowToWorld(x, y)
    {
	return [(x - camera.trans[0] - camera.focus[0]) / camera.zoom[0] +
		camera.focus[0],
		(y - camera.trans[1] - camera.focus[1]) / camera.zoom[1] +
		camera.focus[1]];
    }


    //======================================================================
    // drawing methods

    function transformWorld()
    {
	c.lineWidth = 1 / Math.min(camera.zoom[0], camera.zoom[1]);

	// perform translation
	c.translate(camera.trans[0], camera.trans[1]);
	
	// perform zoom with respect to focus point
	c.translate(camera.focus[0], camera.focus[1]);
	c.scale(camera.zoom[0], camera.zoom[1]);
	c.translate(-camera.focus[0], -camera.focus[1]);
    }


    //======================================================================
    // public methods
    this.clear = function() {
	c.clearRect(0, 0, canvas.width, canvas.height);
    }

    this.add = function(grp) {
	that.world.push(grp);
    }

    this.draw = function() {
	that.clear();

	c.save();
	transformWorld();

	Summon.drawElements(c, that.world);
	c.restore();
    }


    this.translate = function(x, y) {
	camera.trans[0] -= x;
	camera.trans[1] -= y;
    }

    this.zoom = function(x, y) {
	camera.zoom[0] *= x;
	camera.zoom[1] *= y;
    }

    this.focus = function(x, y) {
	camera.trans[0] += (camera.focus[0]-x) * (1.0 - camera.zoom[0]);
	camera.trans[1] += (camera.focus[1]-y) * (1.0 - camera.zoom[1]);
	camera.focus[0] = x;
	camera.focus[1] = y;
    }

    // init
    //addEventListener(canvas, "click", "onclick", test)
    addEventListener(canvas, "mousemove", "onmousemove", mouseMove)
    addEventListener(canvas, "mousedown", "onmousedown", mouseDown)
    addEventListener(canvas, "mouseup", "onmouseup", mouseUp)
    addEventListener(canvas, "DOMMouseScroll", "onmousewheel", mouseWheel)
    addEventListener(canvas, "mousewheel", "", mouseWheel)
    c.strokeStyle = c.fillStyle = "black";
},


// Draws group of elements 'grp' on a context 'c'
drawElements: function drawElements(c, grp)
{
    var elm = grp[0]

    if (elm == "group") {
	for (var i=1; i<grp.length; i++)
	    drawElements(c, grp[i]);
    }

    // graphical elements
    else if (elm == "lines") {
        c.beginPath();
        for (var i=1; i<grp.length; i+=4) {
            c.moveTo(grp[i], grp[i+1]);
            c.lineTo(grp[i+2], grp[i+3]);
        }
        c.stroke();
        c.closePath();
	
    } else if (elm == "quads") {
        c.beginPath();
        for (var i=1; i<grp.length; i+=8) {
            c.moveTo(grp[i], grp[i+1]);
            c.lineTo(grp[i+2], grp[i+3]);
	    c.lineTo(grp[i+4], grp[i+5]);
	    c.lineTo(grp[i+6], grp[i+7]);
	    c.lineTo(grp[i], grp[i+1]);
        }
        c.fill();
        c.closePath();	

    // styles
    } else if (elm == "stroke") {
	c.strokeStyle = grp[1];

    } else if (elm == "fill") {
        c.fillStyle = grp[1];

    // transformations
    } else if (elm == "translate") {
        c.save();
        c.translate(grp[1], grp[2]);
        for (var i=3; i<grp.length; i++)
            drawElements(c, grp[i]);
        c.restore();

    } else if (elm == "rotate") {
        c.save();
        c.rotate(grp[1] * Math.PI / 180);
        for (var i=2; i<grp.length; i++)
            drawElements(c, grp[i]);
        c.restore();

    } else if (elm == "scale") {
        c.save();
        c.scale(grp[1], grp[2]);
	c.lineWidth /= Math.min(grp[1], grp[2]);
	
        for (var i=3; i<grp.length; i++)
            drawElements(c, grp[i]);
        c.restore();


    } else {
	throw "unknown element";
    }
}



};


/*

{

    var mouseMove = function(e)
    {
	if (mouseState == "down") {
            x = e.clientX;
            y = e.clientY;
            x -= canvas.offsetLeft;
            y -= canvas.offsetTop;
            c.lineTo(x, y);
            c.stroke();
            c.moveTo(x, y);
	}
    }

    var mouseDown = function(e)
    {
	mouseState = "down";
	c.beginPath();
	c.moveTo(e.clientX, e.clientY);
    }

    var mouseUp = function(e)
    {
	mouseState = "up";
	c.stroke();
	c.closePath();
    }


}

*/