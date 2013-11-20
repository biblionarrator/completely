/**
 * complete.ly 2.0.0
 * MIT Licensing
 * Copyright (c) 2013 Jared Camins-Esakov, based in part on code from Lorenzo Puccetti
 * 
 * This Software shall be used for doing good things, not bad things.
 * 
**/  
function Completely(container, config) {
    var self = this;
    self.container = container;
    self._controls = { };

    var txtInput = document.createElement('input');
    txtInput.className = 'completely-input';
    txtInput.type ='text';
    txtInput.spellcheck = false; 
    
    var txtHint = txtInput.cloneNode(); 
    txtHint.className = 'completely-hint';
    txtHint.disabled='';        
    
    var wrapper = document.createElement('div');
    wrapper.className = 'completely-wrapper';
    
    var prompt = document.createElement('div');
    prompt.className = 'completely-prompt';

    document.body.appendChild(prompt);            
    var w = prompt.getBoundingClientRect().right; // works out the width of the prompt.
    wrapper.appendChild(prompt);
    prompt.style.visibility = 'visible';
    prompt.style.left = '-'+w+'px';
    wrapper.style.marginLeft= w+'px';
    
    wrapper.appendChild(txtHint);
    wrapper.appendChild(txtInput);
    
    var dropDown = document.createElement('div');
    dropDown.className = 'completely-dropdown';

    var spacer = document.createElement('span'); 
    spacer.className = 'completely-spacer';
    document.body.appendChild(spacer);

    self._controls = {
        input: txtInput,
        hint: txtHint,
        wrapper: wrapper,
        prompt: prompt,
        dropdown: dropDown,
        spacer: spacer
    };
    
    self._onMouseDown = function (ev) {
        self.hideDropDown();
        self.completed(this.__opt);
    };
    
    wrapper.appendChild(dropDown);
    self.container.appendChild(wrapper);
    
    self._calculateWidthForText = function (text) {
        // Used to encode an HTML string into a plain text.
        // taken from http://stackoverflow.com/questions/1219860/javascript-jquery-html-encoding
        spacer.innerHTML = String(text).replace(/&/g, '&amp;')
                                       .replace(/"/g, '&quot;')
                                       .replace(/'/g, '&#39;')
                                       .replace(/</g, '&lt;')
                                       .replace(/>/g, '&gt;');
        return spacer.getBoundingClientRect().right;
    };
    
    /**
     * Register a callback function to detect changes to the content of the input-type-text.
     * Those changes are typically followed by user's action: a key-stroke event but sometimes it might be a mouse click.
    **/
    
    var previousInput;
    var onChange = function (ev) {
        if (txtInput.value.length > 0 && txtInput.value !== previousInput) {
            previousInput = txtInput.value;
            self.tokenentry(txtInput.value, ev);
        }
    };
    //  
    // For user's actions, we listen to both input events and key up events
    // It appears that input events are not enough so we defensively listen to key up events too.
    // source: http://help.dottoro.com/ljhxklln.php
    //
    // The cost of listening to three sources should be negligible as the handler will invoke callback function
    // only if the text.value was effectively changed. 
    //  
    // 
    if (txtInput.addEventListener) {
        txtInput.addEventListener("input",  onChange, false);
        txtInput.addEventListener('keyup',  onChange, false);
        txtInput.addEventListener('change', onChange, false);
    } else { // is this a fair assumption: that attachEvent will exist ?
        txtInput.attachEvent('oninput', onChange); // IE<9
        txtInput.attachEvent('onkeyup', onChange); // IE<9
        txtInput.attachEvent('onchange', onChange); // IE<9
    }
    
    var keyDownHandler = function(ev) {
        ev = ev || window.event;
        var keyCode = ev.keyCode;

        if (typeof self.onkeydown === 'function') {
            if (self.onkeydown.apply(self, arguments) === false) {
                return;
            }
        }
        
        if (keyCode == 33 || keyCode == 34) { return; } // page up/down (do nothing)
        
        if (keyCode == 27) { //escape
            self.canceled();
            return; 
        }
        
        if (keyCode == 39 || keyCode == 35 || keyCode == 9 || keyCode == 13) { // right,  end, tab, enter  (autocomplete triggered)
            ev.preventDefault();
            ev.stopPropagation();
            if (self.current) {
                self.completed(self.current);
                return; 
            }
        }
        
        if (keyCode == 40) return self.moveSelection(+1); // down
        if (keyCode == 38 ) return self.moveSelection(-1); // up
            
        // it's important to reset the txtHint on key down.
        // think: user presses a letter (e.g. 'x') and never releases... you get (xxxxxxxxxxxxxxxxx)
        // and you would see still the hint
        txtHint.value =''; // resets the txtHint. (it might be updated onKeyUp)
        
    };

    config = config || {};
    for (var prop in config) {
        if (config.hasOwnProperty(prop)) {
            self[prop] = config[prop];
        }
    }
    
    if (txtInput.addEventListener) {
        txtInput.addEventListener("keydown",  keyDownHandler, false);
    } else { // is this a fair assumption: that attachEvent will exist ?
        txtInput.attachEvent('onkeydown', keyDownHandler); // IE<9
    }
    setTimeout(function () {
        txtInput.focus();
    }, 0);
    return self;
}

Completely.prototype.update = function () {
    var text = this._controls.input.value;
    var startFrom = this.offset || 0;
    
    // breaking text in leftSide and token.
    var token = text.substring(startFrom);
    var leftSide =  text.substring(0,startFrom);
    
    // updating the hint. 
    this._controls.hint.value = leftSide;
    for (var ii = 0; ii < this.options.length; ii++) {
        if (this.match(this.options[ii], token)) {
            this._controls.hint.value = this._controls.hint.value + (this.hint(this.options[ii]) || '');
            this._controls.hint.__opt = this.options[ii]
            break;
        }
    }
    
    // moving the dropDown and refreshing it.
    this._controls.dropdown.style.left = this._calculateWidthForText(leftSide)+'px';
    this.repaint(this.options, token);
}

Completely.prototype.repaint = function (array, token) {
    var elem = this._controls.dropdown;
    elem.style.visibility = 'hidden';
    elem.innerHTML ='';
    var vph = (window.innerHeight || document.documentElement.clientHeight);
    var rect = elem.parentNode.getBoundingClientRect();
    var distanceToTop = rect.top - 6;                        // heuristic give 6px 
    var distanceToBottom = vph - rect.bottom -6;  // distance from the browser border.

    this.ddoptions = [];
    for (var i=0;i<array.length;i++) {
        array[i].__formatted = array[i].__formatted || this.format(array[i], token);
        if (array[i].__formatted) {
            array[i].__idx = this.ddoptions.length;
            array[i].__hint = array[i].__hint || this.hint(array[i], token);
            var divRow = document.createElement('div');
            divRow.className = 'completely-option';
            divRow.__opt =    array[i];
            divRow.onmousedown = this._onMouseDown; 
            divRow.innerHTML = array[i].__formatted;
            this.ddoptions.push(divRow);
            elem.appendChild(divRow);
        }
    }
    if (this.ddoptions.length===0) {
        return; // nothing to show.
    }
    delete this.previous;
    this.current = this.ddoptions[0].__opt;
    if (this.ddoptions.length===1 && token === this.ddoptions[0].__opt.__hint) {
        return; // do not show the dropDown if it has only one element which matches what we have just displayed.
    }
                
    if (this.ddoptions.length<2) return; 
    this.highlightSelection();
                
    if (distanceToTop > distanceToBottom*3) {        // Heuristic (only when the distance to the to top is 4 times more than distance to the bottom
        elem.style.maxHeight =  distanceToTop+'px';  // we display the dropDown on the top of the input text
        elem.style.top ='';
        elem.style.bottom ='100%';
    } else {
        elem.style.top = '100%';  
        elem.style.bottom = '';
        elem.style.maxHeight =  distanceToBottom+'px';
    }
    elem.style.visibility = 'visible';
};

Completely.prototype.hideDropDown = function () {
    this._controls.dropdown.style.visibility = 'hidden';
};

Completely.prototype.moveSelection = function(step) { // moves the selection either up or down (unless it's not possible) step is either +1 or -1.
    if (this._controls.dropdown.style.visibility === 'hidden') return; // nothing to move if there is no dropDown. (this happens if the user hits escape and then down or up)
    var ix = this.current ? this.current.__idx + step : (step > 0 ? 0 : this.ddoptions.length - 1);
    if (ix !== -1 || ix !== this.ddoptions.length) {
        this.previous = this.current;
        this.current = this.ddoptions[ix].__opt;
        this.highlightSelection();
    }
};

Completely.prototype.highlightSelection = function() {
    if (this.previous) {
        this.ddoptions[this.previous.__idx].className = 'completely-option';
    }
    if (this.current) {
        this.ddoptions[this.current.__idx].className = 'completely-option selected';
        this._controls.hint.value = this.current.__hint;
    }
};

/* You will probably want to overload the following methods */

Completely.prototype.tokenentry = function (input) {
    this.update();
};

Completely.prototype.hint = function (opt) {
    return opt;
};

Completely.prototype.match = function (token, opt) {
    return opt.toLowerCase().indexOf(token.toLowerCase()) === 0;
};

Completely.prototype.format = function (opt, token) {
    if (opt.toLowerCase().indexOf(token.toLowerCase())!==0) { return; }
    return token+'<b>'+opt.substring(token.length)+'</b>';
};

Completely.prototype.canceled = function () {
    this._controls.hint.value = this._controls.input.value; // ensure that no hint is left.
    this._controls.input.focus(); 
};

Completely.prototype.completed = function (opt) {
    this._controls.input.value = this._controls.hint.value;
    this.hideDropDown();
};
