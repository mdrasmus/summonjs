

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


//=============================================================================
// graphics primatives


function Group(children)
{
    Group.prototype.kind = "group";
    this.parent = null;
    this.children = children;

    Group.prototype.push = function push(x) {
	x.parent = this;
	this.children.push(x);
	return x;
    };

    Group.prototype.remove = function remove(x) {
	var i = this.children.indexOf(x);
	this.children.splice(i, 1);
    };
}

function Translate(x, y, children)
{
    Translate.prototype.kind = "translate";
    this.parent = null;
    this.children = children;
    this.data = [x, y];
}

function Scale(x, y, children)
{
    Scale.prototype.kind = "scale";
    this.parent = null;
    this.children = children;
    this.data = [x, y];    
}

function Rotate(r, children)
{
    Rotate.prototype.kind = "rotate";
    this.parent = null;
    this.children = children;
    this.data = [r];    
}


function Graphic(kind, data)
{
    this.kind = kind;
    this.data = data;

    Graphic.prototype.push = function push(x) {
	this.data.push(x);
    };
}

function group()
{
    return new Group(Array.prototype.slice.call(arguments));
}

function lines()
{
    return new Graphic("lines", 
		       Array.prototype.slice.call(arguments));
}

function quads()
{
    return new Graphic("quads", 
		       Array.prototype.slice.call(arguments));
}


function style(data)
{
    return {kind: "style",
	    data: data};
}

function translate(x, y)
{
    return new Translate(x, y, Array.prototype.slice.call(arguments, 2, arguments.length));
}

function scale(x, y)
{
    return new Scale(x, y, Array.prototype.slice.call(arguments, 2, arguments.length));
}

function rotate(r)
{
    return new Rotate(r, Array.prototype.slice.call(arguments, 1, arguments.length));
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
    this.world = group();

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
	c.lineWidth = 1 / Math.max(camera.zoom[0], camera.zoom[1]);

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
	return grp;
    }

    this.remove = function(grp) {
	parent = grp.parent;
	parent.remove(grp);
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

    var elm = grp.kind;

    if (elm == "group") {
	c.save();
	for (var i=0; i<grp.children.length; i++)
	    drawElements(c, grp.children[i]);
	c.restore();
    }

    // graphical elements
    else if (elm == "lines") {
        c.beginPath();
	d = grp.data;
        for (var i=0; i<d.length; i+=4) {
            c.moveTo(d[i], d[i+1]);
            c.lineTo(d[i+2], d[i+3]);
        }
        c.stroke();
        c.closePath();
	
    } else if (elm == "quads") {
        c.beginPath();
	d = grp.data;
        for (var i=0; i<d.length; i+=8) {
            c.moveTo(d[i], d[i+1]);
            c.lineTo(d[i+2], d[i+3]);
	    c.lineTo(d[i+4], d[i+5]);
	    c.lineTo(d[i+6], d[i+7]);
	    c.lineTo(d[i], d[i+1]);
        }
        c.fill();
        c.closePath();	

    // styles
    } else if (elm == "style") {
	for (var key in grp.data) {
	    if (key == "stroke")
		c.strokeStyle = grp.data[key];
	    else if (key == "fill")
		c.fillStyle = grp.data[key];
	}

    // transformations
    } else if (elm == "translate") {
        c.save();
        c.translate(grp.data[0], grp.data[1]);
        for (var i=0; i<grp.children.length; i++)
            drawElements(c, grp.children[i]);
        c.restore();

    } else if (elm == "rotate") {
        c.save();
        c.rotate(grp.data[0] * Math.PI / 180);
        for (var i=0; i<grp.children.length; i++)
            drawElements(c, grp.children[i]);
        c.restore();

    } else if (elm == "scale") {
        c.save();
        c.scale(grp.data[0], grp.data[1]);
	c.lineWidth /= Math.min(grp.data[0], grp.data[1]);
	
        for (var i=0; i<grp.children.length; i++)
            drawElements(c, grp.children[i]);
        c.restore();


    } else {
	throw "unknown element: " + elm;
    }
},


// Draws group of elements 'grp' on a context 'c'
drawElements2: function drawElements(c, grp)
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