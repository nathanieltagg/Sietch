      var builder = null;
      var trialform = null;

      var comps = Formio.Components.components;
      var builder_config =  {
                   noDefaultSubmitButton: true,
                   builder: {
                      dataentry: {

                        title: 'Data entry',
                        default: true,
                        weight: 0, 
                        components: {                           
                                      textfield: true, 
                                      textarea: true, 
                                      number:true, 
                                      SpecNumberComponent: true,
                                      ArrayComponent: true, }
                      },
                      dataentryLeft: {
                        title: "Data / label left",
                        default: false,
                        weight:5,
                        components: {
                          textfield_left: deepmerge(comps.textfield.builderInfo,{schema:{labelPosition:'left-right'}}),
                          //{ title:'Text field', icon:'align-right',schema: {type: 'textfield', labelPosition: 'left-right'} },
                          specnumber_left:deepmerge(SpecNumberComponent.builderInfo,{schema:{labelPosition:'left-right'}}),
                          //{ title:'Number (w spec)', icon:'align-right', schema: {type: 'SpecNumberComponent', labelPosition: 'left-right'} },
                        }
                      },
                      enumerated: {
                        title: 'Enumerations',
                        default: false,
                        weight: 10,
                        components: { radio: true,
                                      select: true,
                                      selectboxes: true,
                                      
                                      }

                      },
                      specialized: {
                        title: 'Specialized',
                        weight: 20,
                        components: { ComponentUUID:true,
                                      TestIdComponent:true,
                                      url: true,
                                      qrCode:true,
                                      datetime: true,
                                      file: comps.file.builderInfo,

                                      file: {title: "File upload", icon: 'file', schema: {type: 'file', label: 'File Upload', key: 'files'}},
                                      ImageAnnotator: true,
                                      image: deepmerge(comps.file.builderInfo,{title: "Image upload", icon: 'picture-o', schema: {label: 'Picture upload', key:'picture', image: true}}),
                                      CustomGeoTagComponent: true,




                        }
                      },
                      
                      mulitple:{
                        title: 'Multiple',
                        weight: 30,
                        components: { 
                                    //- BetterDataGrid: true,
                                    datamap: true, 
                                    datagrid: true,
                                    editgrid: true,
                                    tree:true,
                                    }
                      },
                      layout: {
                        title: "Layout",
                        default: false,
                        weight: 40,
                        components: { 
                          //- WorkStepComponent: true,
                          htmlelement: { title:"HTML", icon:'code', weight: 1000, schema:{type: 'htmlelement'}},
                          content: true,
                          columns: true,
                          fieldset: true,
                          panel: true,
                          table: true,
                          tabs: true,
                          well:true,
                          container: true,
                          DatabaseImage: true,
                          DatabaseFile: true,
                          AnnotatedImage: true
                        }
                      },

                      misc: {
                        title: 'Little-used',
                        default: false,
                        weight: 1000,
                        components: {
                        hidden: true,
                        tags: true,
                        email: true,
                        phoneNumber: true,
                        address: true,
                        day: true,
                        time: true,
                        signature: true,
                        button: true,
                        saveDraftButton: {title: 'Save Draft button', icon: 'button', weight: 1000, schema:{type:'button', action:"saveState", state: 'draft', theme: 'secondary', key:'saveAsDraft', label:'Save Draft'}}
                        //- currency: true,
                          //- survey: true,
                        //- password: true

                        }
                      },

                      basic: false,
                      advanced: false,
                      data: false,
                      //- layout: false,
                      premium: false,

                      //- custom: {
                      //-   title: 'Custom',
                      //-   default: false,
                      //-   weight: 10,
                      //-   components: {
                      //-     ComponentUUID:true,
                      //-     CustomGeoTagComponent: true,
                      //-     ArrayComponent: true,
                      //-     SpecNumberComponent: true,
                      //-     WorkStepComponent: true,
                        
                      //-   }
                      //- }
                  }
              };

      function updateSchemaField(schema)
      {
        $('#schema').val(JSON.stringify(schema,null,2));
        var schema_blob = new Blob([JSON.stringify(schema,null,2)],{type: 'application/JSON'});
        var schema_save_url = window.URL.createObjectURL(schema_blob);
        $('#download_schema_link').attr('href',schema_save_url);
      }
      function onBuild() {
        //- var schema_element = document.getElementById('schema');

        metaform.submission.data.schema = builder.instance.schema; // Copy it over.
        updateSchemaField(builder.instance.schema);
        $('#trialform').empty();

        // Create a trial form
        new Formio.createForm(document.getElementById('trialform'),builder.instance.form).then(function(form) {
          trialform = form;
          trialform.on('change', function() {
            $('#trialdata').html(JSON.stringify(form.submission, null, 2))
          });
        })

        console.log("onBuild",JSON.stringify(builder.instance.schema));

      };
      var gformdata;

      function schemaRecordChange(formdata) {
          console.log("schemaRecordChange",formdata);
          gformdata = formdata;
          var metadata = metaform.submission.data;
          // increment version number here.
          if(formdata.validity.version>=0) formdata.validity.version+=1;

          // If the start date is in the past, make the new start date 'now'
          if(formdata.validity && moment(formdata.validity.startDate).isBefore(moment())) 
            formdata.validity.startDate = moment().toISOString();

          // If no form title, autofill with the form ID
          if(!formdata.formName || (formdata.formName.length==0))
            formdata.formName = formdata.formId;

          // set.
          metaform.submission = {data: formdata};

          updateSchemaField(formdata.schema);

          if(builder) {
            builder.setForm(formdata.schema);
          } else {
            builder = new Formio.FormBuilder(
              $('.formbuilder_area').get(0), // html element
              formdata.schema||{}, // starting schema
              builder_config);

            $('input#commit-schema').val(JSON.stringify(schema));
            
            builder.instance.ready.then(function(){
              if(builder_wizard) builder.setDisplay('wizard').then(onBuild);
              else onBuild();


              builder.instance.on('change',onBuild);
              builder.instance.on('saveComponent',onBuild);
              builder.instance.on('editComponent',onBuild);
            });
        }
      }

      function SubmitData(submission) {
        console.log("submitting data",submission);
        $.post({
            contentType: 'application/json',
            url:  "/json/"+collection+"/"+formId,
            data: JSON.stringify(submission.data),
            success: schemaRecordChange
        }).fail(function(res,statusCode,statusMsg) {
          // On failure, add a failure message
          if(res.responseText && res.responseText.length>0) metaform.setAlert("danger",res.responseText);
          else                                              metaform.setAlert("danger",statusMsg + " ("+statusCode+")");
          //- alert("posting failed");
          console.log("posting fail",res,statusCode,statusMsg);
        });

      };


      function findComponent(components,key) {
        for(var c of components) {
          if(c.key === key) return c;
          if(c.components) {
            var ff = findComponent(c.components,key);
            if(ff) return ff;
          }
        }
      }
      $(function(){

        //- console.log("schema",record.schema);
        // First, modify the metaschema based on the component type list
        //- var omponentTypesComponent = Formio
        var componentTypes_component = findComponent(metaschema.components,"componentTypes");
        if(componentTypes_component && componentTypes) {
          for(var t of componentTypes) componentTypes_component.data.values.push({label:t.type,value:t.type});
        }

        // Create the metaform
        Formio.createForm(document.getElementById('metaform'),metaschema).
          then((createdform)=> {
            metaform = createdform;          
            console.log("metaform built",metaform);
            metaform.on('submit',SubmitData);
            $.get('/json/'+collection+'/'+formId,schemaRecordChange).fail(function(){
                $('#builder').html("No such form exists.")
            });
          });
  
        // validate on client side.
        $('#commit').on('click',function(event){
          if($('input#formId').val().length<1) {alert("Need to enter a form ID"); return false;}
          if($('input#formName').val().length<1) {alert("Need to enter a form title"); return false;}

          var data = $( '#metaform'  ).serialize();
          $.post({
            url: '/json/'+collection+'/'+formId,
            data: data,
            success: schemaRecordChange
          }).fail(function(j,textStatus,errorThrown){
              $('#builder').html("something went wrong,could not post: "+textStatus);
          });
          return false;
        });

        $('#schema').change(function(){
          builder.form = JSON.parse($('#schema').val());
          metaform.submission.data.schema = builder.instance.schema; // Copy it over.

          console.log("updated schema json->builder")
          //- builder.instance.redraw();
        })

        // buttons
        $('#copySchemaToClipboard').on('click',function(){
          var str = $('#schema').val();
          navigator.clipboard.writeText(str)
            .then()
            .catch( (e)=>{ alert("couldn't copy to clipboard"); } );
        })

        $('#pasteSchemaFromClipboard').on('click',function(){
          var str = $('#schema').val();
          navigator.clipboard.readText().then(
            (s) => {
                      $('#schema').val(s);
                      $('#schema').trigger("change"); 
                    }
          )
            .catch( (e)=>{ alert("couldn't paste from clipboard"); } );
        })

      });


