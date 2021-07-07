

///
/// Custom component for lists of numbers.
///
/// Basically sets some good defaults for what a UUID should look like
///
/// To do: add default validation technique.
///


// Formio.Components.components.file.builderInfo.schema=Formio.Components.components.file.schema();
var TextFieldComponent = Formio.Components.components.textfield;

var gArrayComp;

class ArrayComponent extends TextFieldComponent{


  static schema(...extend) {
    return TextFieldComponent.schema({
      "label": "Array Data",
      "placeholder": "paste comma-delimted values here",
      "customClass": "component-array-sietch",
      "errorLabel": "Does not parse",
      "key": "array",
      "type": "ArrayComponent",
      "input": true  ,
      "defaultValue": [],
      "specification_minimum": 3,
      "specification_maximum": 12,
      "units": "Value"
    }, ...extend);
  }

  static get builderInfo() {
    return {
      title: 'Array of numbers',
      group: 'custom',
      icon: 'bar-chart',
      weight: 72,
      documentation: '#', 
      schema: ArrayComponent.schema()
     };
  }

  get emptyValue() {
    return [];
  }
  
  renderElement(value,index) 
  {
    console.log('renderElement',this,value,index);
    if(!value) value = this.parseText('');
    if(value.data) value = value.data; // Backward comp
    var textvalue = value.join(',');
    // tpl += "<input ref='input' type='text'>";
    var tpl = '';
    tpl += super.renderElement(textvalue,index);
    gArrayComponentId++;
    tpl += `<div class='array-component-readonly-text' ref='readonly_display'></div>`
    tpl += `<button class="btn btn-secondary btn-sm" type="button" data-toggle="collapse" data-target="#componentArrayCollapse${gArrayComponentId}" aria-expanded="false" aria-controls="collapseExample">Show Info</button>`
    tpl += `<div class="collapse" id="componentArrayCollapse${gArrayComponentId}">`;
    tpl += '<div class="d-sm-flex flex-row">';
    tpl += '<div class="p-2">';
    tpl += `<div>Data length: <span class='arrayComponentLength'></span></div>`;
    tpl += `<div>Min: <span class='arrayComponentMin'></span></div>`;
    tpl += `<div>Max: <span class='arrayComponentMax'></span></div>`;
    tpl += `<div>Mean: <span class='arrayComponentMean'></span></div>`;
    tpl += `<div>RMS: <span class='arrayComponentRMS'></span></div>`;
    var bounds = this.getBounds();
    if(!isNaN(bounds.hi)) tpl += `<div>Out-of-spec high: <span class='arrayComponentOobHi'>n/a</span></div>`;
    if(!isNaN(bounds.lo)) tpl += `<div>Out-of-spec low: <span class='arrayComponentOobLo'>n/a</span></div>`;
    tpl += "</div>"
    tpl += `<div class='flex-grow-1 p-2 arrayComponentGraph' style='height:200px; width: 240px;'></div>`;
    tpl += `<div class='flex-grow-1 p-2 arrayComponentHistogram' style='height:200px; width: 240px;'></div>`;

    tpl += '</div>'
    tpl += '</div>'

    return tpl;

  }


  parseText(text) {
    text = text || "";
    var arr = text.split(',');
    console.log("parseText",arr)
    return arr;
  }

  getBounds() {
    var bounds = {lo:NaN, hi:NaN};
    if(('specification_nominal' in this.component) && ('specification_tolerance' in this.component)) {
      bounds.lo = this.component.specification_nominal - this.component.specification_tolerance;
      bounds.hi = this.component.specification_nominal + this.component.specification_tolerance;
    }
    if('specification_minimum' in this.component) bounds.lo=this.component.specification_minimum;
    if('specification_maximum' in this.component) bounds.hi=this.component.specification_maximum;
    return bounds;
  }

  updateExtras(value) {
    gArrayComp = this;
    // Normalize the input value.
    var arr = value || [];
    var min = 1e99;//Number.MAX_VALUE;
    var max = -1e99;//Number.MIN_VALUE;
    var non_numeric = 0;
    if(arr.length<1) { min=0; max=0; }
    // Out of bounds limits:
    var bounds = this.getBounds();
    var oobHi =0;
    var oobLo =0;
    for(var i=0;i<arr.length;i++) {
      var x = parseFloat(arr[i]);
      if(isNaN(x)) non_numeric++;
      else {        
        min = Math.min(min,x);
        max = Math.max(max,x);
        if(x>bounds.hi) oobHi++; // If bounds are NaN, tests always return false.
        if(x<bounds.lo) oobLo++;
        arr[i] = x;        
      }
    }
    var len = arr.length;
    console.log('updateExtras',arr,min,max,non_numeric);
    $("span.arrayComponentLength",this.element).text(len);
    $("span.arrayComponentMin",this.element).text(min.toFixed(2));
    $("span.arrayComponentMax",this.element).text(max.toFixed(2));
    $("span.arrayComponentOobHi",this.element).text(oobHi.toFixed(2));
    $("span.arrayComponentOobLo",this.element).text(oobLo.toFixed(2));

    // Graph.
    var graph = new Histogram(len,0,len);
    graph.data = arr;
    graph.min_content = min;
    graph.max_content = max;
    var blackscale = new ColorScaleRGB(50,50,100); 

    this.LizardGraph.SetHist(graph,blackscale);
    this.LizardGraph.ResetDefaultRange();
    this.LizardGraph.Draw();
    console.log('graph',graph);
    //histogram
    var hist = new Histogram(Math.round(len/10)+10,min,max);
    for(var x of arr) { hist.Fill(x);}
    var colorscale = new ColorScaleRGB(50,50,50);
    colorscale.min = min;
    colorscale.max = max;
    this.LizardHistogram.SetHist(hist,colorscale);
    this.LizardHistogram.SetMarkers([bounds.lo,bounds.hi]);
    this.LizardHistogram.marker_color = "rgba(100,0,0,0.5)";

    this.LizardHistogram.Draw();
      // Stats.

    $("span.arrayComponentMean",this.element).text(hist.GetMean().toFixed(2));
    $("span.arrayComponentRMS",this.element).text(hist.GetRMS().toFixed(2));


  } 

  attach(element)  {
    /// Called after rendering, just as the component is being inserted into the DOM.
    /// .. just like a text area...
    this.loadRefs(element, {readonly_display: 'single'});
    super.attach(element);
    console.log("attaching",this,element);
    this.LizardGraph = new HistCanvas($("div.arrayComponentGraph",this.element),
        {margin_left: 40});
    this.LizardGraph.default_options.doDots = true;
    this.LizardGraph.default_options.doFill = false;
    this.LizardGraph.ylabel = this.component.units || "Value";
    this.LizardGraph.xlabel = "Element";

    this.LizardHistogram = new HistCanvas($("div.arrayComponentHistogram",this.element),{margin_left: 40});
    this.LizardHistogram.xlabel = this.component.units || "Value";
    this.LizardHistogram.ylabel = "Counts";
    
    var rodisp = this.refs.readonly_display;
    this.LizardGraph.DoMouseClick = function(ev,u,v)
    {
      var index = parseInt(u);
      var elem = rodisp.children[index];
      if(elem) {
        // $(rodisp).scrollTo($(elem));
        var s = elem.offsetLeft-100;
        rodisp.scrollLeft = s;
        $(elem).stop().fadeOut(250).fadeIn(250);
      }
    }

    if(this.arrayValue) this.updateExtras(this.arrayValue);

    if(this.disabled && this.arrayValue) {
      $(this.refs.input[0]).hide();
      var d = $(this.refs.readonly_display);
      d.html(this.arrayValue.map(x=>"<span>"+x+"</span>").join(','));
    }

    var self= this;
    $('.collapse',this.element).on('shown.bs.collapse', function () {
      // unhiding
      console.log("unhiding")
      self.LizardGraph.Resize();
      self.LizardGraph.Draw();
      self.LizardHistogram.Resize();
      self.LizardHistogram.Draw();

    });
  }

  setValue(value,flags)
  {
    console.log('setValue',this,value,flags);

    var arr = value || [];
    if(! Array.isArray(arr)) arr = [value];
    this.arrayValue = arr;
    this.textValue = arr.join(',');
    this.updateExtras(this.arrayValue);

    const input = this.performInputMapping(this.refs.input[0]);
    input.value = this.textValue;

    return super.setValue(value,flags);
  }

  setValueAt(index,value,flags)
  {
    // Don't do anything; it's called by Component.setValue, and we don't need it.


    console.log('setValueAt',this,index,value,flags);
    console.log("this.value",this.value);
    // debugger;

    // var arr = value || [];
    // if(! Array.isArray(arr)) arr = [value];
    // var textvalue = arr.join(',');
    // this.updateExtras(value);
    // return super.setValue(index,textvalue,flags);
  }

  getValueAt(index)
  {
    console.log('getValue',this,$("span.arrayComponentLength",this.element));
    var textvalue =  this.refs.input[0].value;
    var value = this.parseText(textvalue);
    this.updateExtras(value);
    return value;
  }


} // end class

var gArrayComponentId=0;


// function ArrayComponent(component, options, data) {
//   // This is a normal text field...
//   acuuid = this;
//   aBaseComponent.prototype.constructor.call(this, component, options, data);
// }

// // Perform typical ES5 inheritance
// ArrayComponent.prototype = Object.create(aBaseComponent.prototype);
// ArrayComponent.prototype.constructor = ArrayComponent;

// ArrayComponent.schema = function() {
//   var s= aBaseComponent.schema({
//       "label": "Array Data",
//       "placeholder": "paste comma-delimted values here",
//       "customClass": ".component-array-formio",
//       "errorLabel": "Does not parse",
//       "key": "array",
//       "type": "ArrayComponent",
//       "input": true  ,
//       "defaultValue": [],
//     })
//   console.log('schema',s);
//   return s;
// };
// ArrayComponent.builderInfo = {
//   title: 'ArrayComponent',
//   group: 'custom',
//   icon: 'chart-bar fas',
//   weight: 72,
//   documentation: '#', 
//   schema: ArrayComponent.schema()
// };



// ArrayComponent.prototype.renderElement = function(value,index) 
// {
//   console.log('renderElement',this,value,index);
//   if(!value) value = this.parseText('');
//   var textvalue = value.data.join(',');
//   var arr = (value||{}).data ||[];
//   // tpl += "<input ref='input' type='text'>";
//   var tpl = '';
//   tpl += TextFieldComponent.prototype.renderElement.call(this,textvalue,index);
//   gArrayComponentId++;
//   tpl += `<button class="btn btn-secondary btn-sm" type="button" data-toggle="collapse" data-target="#componentArrayCollapse${gArrayComponentId}" aria-expanded="false" aria-controls="collapseExample">Show Info</button>`
//   tpl += `<div class="collapse" id="componentArrayCollapse${gArrayComponentId}">`;
//   tpl += '<div class="d-sm-flex flex-row">';
//   tpl += '<div class="p-2">';
//   tpl += `<div>Data length: <span class='arrayComponentLength'>${arr.length}</span></div>`;
//   tpl += `<div>Min: <span class='arrayComponentMin'>${value.min.toFixed(2)}</span></div>`;
//   tpl += `<div>Max: <span class='arrayComponentMax'>${value.max.toFixed(2)}</span></div>`;
//   tpl += `<div>Mean: <span class='arrayComponentMean'></span></div>`;
//   tpl += `<div>RMS: <span class='arrayComponentRMS'></span></div>`;
//   tpl += "</div>"
//   tpl += `<div class='flex-grow-1 p-2 arrayComponentGraph' style='height:200px; width: 240px;'></div>`;
//   tpl += `<div class='flex-grow-1 p-2 arrayComponentHistogram' style='height:200px; width: 240px;'></div>`;

//   tpl += '</div>'
//   tpl += '</div>'

//   return tpl;

// }

// ArrayComponent.prototype.parseText = function(text)
// {
//   text = text || "";
//   if(text.length==0) { return {data:[], min:0, max:0, non_numeric: 0}; };
//   var arr = text.split(',');
//   var min = 1e99;//Number.MAX_VALUE;
//   var max = -1e99;//Number.MIN_VALUE;
//   var non_numeric = 0;
//   for(var i=0;i<arr.length;i++) {
//     if(isNaN(arr[i])) non_numeric++;
//     else {
//       var x = parseFloat(arr[i]);
//       min = Math.min(min,x);
//       max = Math.max(max,x);
//       arr[i] = x;
//     }
//   }
//   return {
//     data: arr,
//     min: min,
//     max: max,
//     non_numeric: non_numeric
//   };

// }

// ArrayComponent.prototype.updateExtras = function(value)
// {
//   console.log('updateExtras',value);
//   var len = ((value||{}).data||[]).length;
//   $("span.arrayComponentLength",this.element).text(len);
//   $("span.arrayComponentMin",this.element).text((value||{}).min.toFixed(2));
//   $("span.arrayComponentMax",this.element).text((value||{}).max.toFixed(2));

//   // Stats.

//   // Graph.
//   var graph = new Histogram(len,0,len);
//   graph.data = [...value.data];
//   graph.min_content = value.min;
//   graph.max_content = value.max;
//   var blackscale = new ColorScaleIndexed(0);  
//   this.LizardGraph.SetHist(graph,blackscale);
//   this.LizardGraph.ylabel = "Value";
//   this.LizardGraph.xlabel = "Element";
//   this.LizardGraph.ResetDefaultRange();
//   this.LizardGraph.Draw();

//   //histogram
//   var hist = new Histogram(100,value.min,value.max);
//   for(var x of value.data) { hist.Fill(x);}
//   var colorscale = new ColorScaler("BrownPurplePalette");
//   colorscale.min = value.min;
//   colorscale.max = value.max;
//   this.LizardHistogram.xlabel = "Value";
//   this.LizardHistogram.ylabel = "Counts";
//   this.LizardHistogram.SetHist(hist,colorscale);
//   this.LizardHistogram.Draw();
//     // Stats.

//   $("span.arrayComponentMean",this.element).text(hist.GetMean().toFixed(2));
//   $("span.arrayComponentRMS",this.element).text(hist.GetRMS().toFixed(2));


// } 


// ArrayComponent.prototype.attach = function(element) 
// {
//   /// Called after rendering, just as the component is being inserted into the DOM.
//   /// .. just like a text area...
//   aBaseComponent.prototype.attach.call(this,element);
//   this.LizardGraph = new HistCanvas($("div.arrayComponentGraph",this.element),
//       {margin_left: 40});
//   this.LizardHistogram = new HistCanvas($("div.arrayComponentHistogram",this.element),{margin_left: 40});

//   var self= this;
//   $('.collapse',this.element).on('shown.bs.collapse', function () {
//     // unhiding
//     console.log("unhiding")
//     self.LizardGraph.Resize();
//     self.LizardGraph.Draw();
//     self.LizardHistogram.Resize();
//     self.LizardHistogram.Draw();

//   });
// }

// ArrayComponent.prototype.setValue = function(value,flags)
// {
//   console.log('setValue',this,value,flags);

//   var arr = (value||{}).data ||[];
//   var textvalue = arr.join(',');
//   this.updateExtras(value);
//   return aBaseComponent.prototype.setValue.call(this,textvalue);
// }

// ArrayComponent.prototype.getValue = function()
// {
//   console.log('getValue',this,$("span.arrayComponentLength",this.element));
//   var textvalue =  this.refs.input[0].value;
//   var value = this.parseText(textvalue);
//   this.updateExtras(value);
//   return value;
// }

ArrayComponent.editForm = function(a,b,c)
{
    var form = TextFieldComponent.editForm(a,b,c);
    var tabs = form.components.find(obj => { return obj.type === "tabs" });
    var datatab = tabs.components.find(obj => {return obj.key=='data'});

    // Remove 'multiple components'. I could probably make it work.. but nah
    datatab.components.splice(datatab.components.findIndex(obj=>{return obj.key = "multiple"}),1);
    var displaytab = tabs.components.find(obj => {return obj.key=='display'});


    datatab.components.splice(1,0,
      {
        "input": true,
        "key": "specification_nominal",
        "label": "Nominal Value",
        "placeholder": "Nominal value ",
        "tooltip": "This is the nominal value each value should be close to",
        "type": "number",
      },
      {
        "input": true,
        "key": "specification_tolerance",
        "label": "Tolerance",
        "tooltip": "This is the tolerance, plus or minus, around the nominal value. If outside this range, a warning will show.",
        "type": "number",
      },
      {
        "input": true,
        "key": "specification_minimum",
        "label": "Minimum Specification",
        "tooltip": "If less than this value, a warning will show.",
        "type": "number",
      },      
      {
        "input": true,
        "key": "specification_maximum",
        "label": "Maximum Specification",
        "tooltip": "If greater than than this value, a warning will show.",
        "type": "number",
      },
      {
        "input": true,
        "key": "units",
        "label": "Units",
        "tooltip": "Units or description of value (put on vertical scale)",
        "type": "textfield",
      }
  );


    return form;
}
Formio.Components.addComponent('ArrayComponent', ArrayComponent);


