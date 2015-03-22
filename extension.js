
const PanelMenu = imports.ui.panelMenu;
const St = imports.gi.St;
const Main = imports.ui.main;
const Shell = imports.gi.Shell;
const GLib = imports.gi.GLib;
const Util = imports.misc.util;
const Clutter = imports.gi.Clutter
const Mainloop = imports.mainloop;
const Lang = imports.lang;
const PopupMenu = imports.ui.popupMenu;

let _CpuFreqButton = null;


const CpuFreqButton = new Lang.Class({
    Name: 'CpuFreqButton',
    Extends: PanelMenu.Button,

    _init: function() {    
        this.governorchanged = false;
        
        //cpupower used
        this.cpupower = false;
        
        //cpufreqinfo or cpupower installed
        this.util_present = true;
        //cpufreq-selector installed
        this.selector_present = true;
        
        this.cpuFreqSelectorPath = GLib.find_program_in_path('cpufreq-selector');
        if(!this.cpuFreqSelectorPath){
            this.selector_present = false;
        }
        
        this.cpuFreqInfoPath = GLib.find_program_in_path('cpufreq-info');
        if(!this.cpuFreqInfoPath){
            this.cpuPowerPath = GLib.find_program_in_path('cpupower');
            if(this.cpuPowerPath){
                this.cpupower = true;
                this.selector_present = true;
            }
            else{
                this.util_present = false;
            }
        }
    
        // build ui
        this.parent(St.Align.START);
        this.buttonText = new St.Label({
            text: "--",
            y_align: Clutter.ActorAlign.CENTER
        });
        this.actor.add_actor(this.buttonText);
             
        // check label and menu evry 60 secs
        this._refresh_rate = 5;
        this._timeout = Mainloop.timeout_add_seconds(this._refresh_rate, Lang.bind(this, this._refresh));
             
        this._cpuPowerPath = GLib.find_program_in_path('cpupower')   
        this._pkexec = GLib.find_program_in_path('pkexec') 
        // refresh view
        this._refresh();
    },
   
   
    _get_governors: function(){
        let governors=new Array();
        let governorslist=new Array();
        let governoractual='';
        
        if (this.cpuFreqInfoPath){
            //get the list of available governors
            let cpufreq_output1 = GLib.spawn_command_line_sync(this.cpuFreqInfoPath+" -g");
            if(cpufreq_output1[0]) governorslist = cpufreq_output1[1].toString().split("\n", 1)[0].split(" ");
            
            //get the actual governor
            let cpufreq_output2 = GLib.spawn_command_line_sync(this.cpuFreqInfoPath+" -p");
            if(cpufreq_output2[0]) governoractual = cpufreq_output2[1].toString().split("\n", 1)[0].split(" ")[2].toString();
            
            for each (let governor in governorslist){
                let governortemp;
                if(governoractual==governor)
                    governortemp=[governor,true];
                else
                    governortemp=[governor,false];

                // Capitalize the First letter of the governor name
                governortemp[0] = governortemp[0][0].toUpperCase() + governortemp[0].slice(1);
                governors.push(governortemp);
            }
        }
        if(this.cpuPowerPath){
             //get the list of available governors
            let cpupower_output1 = GLib.spawn_command_line_sync(this.cpuPowerPath+" frequency-info -g");
            if(cpupower_output1[0]) governorslist = cpupower_output1[1].toString().split("\n", 2)[1].split(" ");
            
            //get the actual governor
            let cpupower_output2 = GLib.spawn_command_line_sync(this.cpuPowerPath+" frequency-info -p");
            if(cpupower_output2[0]) governoractual = cpupower_output2[1].toString().split("\n", 2)[1].split(" ")[2].toString();
            
            for each (let governor in governorslist){
                let governortemp;
                if(governoractual==governor)
                    governortemp=[governor,true];
                else
                    governortemp=[governor,false];
                governors.push(governortemp);                
            }
        }
        
        return governors;
    },
   
    _refresh_button_label: function() {
        // set the button label
        let title = "--"
        let freqInfo=null;
        let cpupower_output = GLib.spawn_command_line_sync(this._cpuPowerPath+" frequency-info -fm");
         
        if(cpupower_output[0])  {
            freqInfo = cpupower_output[1].toString().split("\n")[1];
            title=freqInfo;
        } else{
            title="!";
        }
        this.buttonText.set_text(title);
    },
   
    _refresh_button_menu: function() {   
        // create new menu items
        this.menu.removeAll();
        if(this.util_present){  
            //get the available governors
            this.governors = this._get_governors();
                
            //build the popup menu
            if (this.governors.length>0){
                let governorItem;
                for each (let governor in this.governors){
                    governorItem = new PopupMenu.PopupMenuItem("");
                    let governorLabel=new St.Label({
                        text:governor[0],
                        style_class: "sm-label"
                    });
                    governorItem.actor.add_child(governorLabel);
                    governorItem.setOrnament(governor[1]);
                    this.menu.addMenuItem(governorItem);
                    
                    if(this.selector_present){
                        governorItem.connect('activate', Lang.bind(this, function() {                          
                            if(this.cpupower) {
                                this.governorchanged=Util.trySpawnCommandLine(this._pkexec + " " 
                                    + this.cpuPowerPath+" frequency-set -g "+governorLabel.text);                           
                            } else {
                                this.governorchanged=Util.trySpawnCommandLine(this._pkexec + " "
                                    + this.cpuFreqSelectorPath+" -g "+governorLabel.text);
                            }                            
                        }));
                    }
                }
            }
        }
        if(!this.util_present){
            let errorItem;
            errorItem = new PopupMenu.PopupMenuItem("");
            let errorLabel=new St.Label({
                text:"Please install cpupower or cpufreq-utils",
                style_class: "sm-label"
            });
            errorItem.actor.add_child(errorLabel);
            this.menu.addMenuItem(errorItem);
        }
        
        if(!this.selector_present){
            let errorItem;
            errorItem = new PopupMenu.PopupMenuItem("");
            let errorLabel=new St.Label({
                text:"Please install cpufreq-selector",
                style_class: "sm-label"
            });
            errorItem.actor.add_child(errorLabel);
            this.menu.addMenuItem(errorItem);
        }
    },
   
    _refresh: function() {   
        this._refresh_button_label();
        this._refresh_button_menu();
        return true;
    },

    destroy: function() {
        if(this._timeout) {
            Mainloop.source_remove(this._timeout);
            this._timeout = null;
        }
        this.parent();
    }
});

// init function
function init(metadata) {
}

// enable function
function enable() {
    _CpuFreqButton = new CpuFreqButton;
    Main.panel.addToStatusArea('pu-freq-button', _CpuFreqButton);  
}

// disable function
function disable() {
    if(_CpuFreqButton) {
        _CpuFreqButton.destroy();
        _CpuFreqButton = null;
    }
}


