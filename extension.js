const St = imports.gi.St;
const Lang = imports.lang;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Main = imports.ui.main;
const GLib = imports.gi.GLib;
const Util = imports.misc.util;
const Mainloop = imports.mainloop;

function CpuFreq() {
    this._init.apply(this, arguments);
}


CpuFreq.prototype = {
    __proto__: PanelMenu.SystemStatusButton.prototype,

    _init: function(){
        PanelMenu.SystemStatusButton.prototype._init.call(this, 'cpufreq');
        this.governorchanged = false;
        
        //cpupower used
        this.cpupower = false;
        
        //cpufreqinfo or cpupower installed
        this.util_present = true;
        //cpufreq-selector installed
        this.selector_present = true;
        
        this.statusLabel = new St.Label({
            text: "--",
            style_class: "cpufreq-label"
        });
        
        this.cpuFreqInfoPath = this._detectCpuFreqInfo();
        if(!this.cpuFreqInfoPath){
            this.cpuPowerPath = this._detectCpuPower();
            if(this.cpuPowerPath){
                this.cpupower = true;
            }
            else{
                this.util_present = false;
            }
        }

        this.cpuFreqSelectorPath = this._detectCpuFreqSelector();
        if(!this.cpuFreqSelectorPath){
            this.selector_present = false;
        }

        this._build_ui();
        
        if(this.util_present){
            //update every 5 seconds
            event = GLib.timeout_add_seconds(0, 5, Lang.bind(this, function () {
                this._update_freq();
                this._update_popup();
                return true;
            }));
        }
    },

    _detectCpuFreqInfo: function(){
        //detect if cpufreq-info is installed
        let ret = GLib.spawn_command_line_sync("which cpufreq-info");
        if ( (ret[0]) && (ret[3] == 0) ) {//if yes
            return ret[1].toString().split("\n", 1)[0];//find the path of cpufreq-info
        }
        return null;
    },
    
    _detectCpuPower: function(){
        //detect if cpufreq-info is installed
        let ret = GLib.spawn_command_line_sync("which cpupower");
        if ( (ret[0]) && (ret[3] == 0) ) {//if yes
            return ret[1].toString().split("\n", 1)[0] + " frequency-info";//find the path of cpupower
        }
        return null;
    },
    
    _detectCpuFreqSelector: function(){
        //detect if cpufreq-selector is installed
        let ret = GLib.spawn_command_line_sync("which cpufreq-selector");
        if ( (ret[0]) && (ret[3] == 0) ) {//if yes
            return ret[1].toString().split("\n", 1)[0];//find the path of cpufreq-info
        }
        return null;
    },
    
    _get_cpu_number: function(){
        let ret = GLib.spawn_command_line_sync("grep -c processor /proc/cpuinfo");
        return ret[1].toString().split("\n", 1)[0];
    },
    
    _get_governors: function(){
        let governors=new Array();
        let governorslist=new Array();
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
                governors.push(governortemp);                
            }
        }
        if(this.cpuPowerPath){
             //get the list of available governors
            let cpupower_output1 = GLib.spawn_command_line_sync(this.cpuPowerPath+" -g");
            if(cpupower_output1[0]) governorslist = cpupower_output1[1].toString().split("\n", 2)[1].split(" ");
            
            //get the actual governor
            let cpupower_output2 = GLib.spawn_command_line_sync(this.cpuPowerPath+" -p");
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

    _update_freq: function() {
        let freqInfo=null;
        if(this.util_present){
            if (this.cpuFreqInfoPath){
                let cpufreq_output = GLib.spawn_command_line_sync(this.cpuFreqInfoPath+" -fm");//get the output of the cpufreq-info -fm command
                if(cpufreq_output[0]) freqInfo = cpufreq_output[1].toString().split("\n", 1)[0];
                if (freqInfo){
                    this.title=freqInfo;
                }
            }
            
            if (this.cpuPowerPath){
                let cpupower_output = GLib.spawn_command_line_sync(this.cpuPowerPath+" frequency-info -fm");//get output of cpupower frequency-info -fm
                if(cpupower_output[0]) freqInfo = cpupower_output[1].toString().split("\n")[1];
                if (freqInfo){
                    this.title=freqInfo;
                }
            }
        }
        else{
            this.title="!"
        }
        
        this.statusLabel.set_text(this.title);
    },
    
    _update_popup: function() {
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
                    governorItem.addActor(governorLabel);
                    governorItem.setShowDot(governor[1]);
                    this.menu.addMenuItem(governorItem);
                    
                    if(this.selector_present){
                        governorItem.connect('activate', Lang.bind(this, function() {
                            for (i = 0 ;i < this._get_cpu_number();i++){
                                this.governorchanged=GLib.spawn_command_line_async(this.cpuFreqSelectorPath+" -g "+governorLabel.text+" -c "+i);
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
            errorItem.addActor(errorLabel);
            this.menu.addMenuItem(errorItem);
        }
        
        if(!this.selector_present){
            let errorItem;
            errorItem = new PopupMenu.PopupMenuItem("");
            let errorLabel=new St.Label({
                text:"Please install cpufreq-selector",
                style_class: "sm-label"
            });
            errorItem.addActor(errorLabel);
            this.menu.addMenuItem(errorItem);
        }
    
    },
    
    _build_ui: function() {
        // destroy all previously created children, and add our statusLabel
        this.actor.get_children().forEach(function(c) {
            c.destroy()
        });
        
        this.actor.add_actor(this.statusLabel);
        this._update_freq();
        this._update_popup();
        
    }

}

function init() {
//do nothing
}

let indicator;
let event=null;

function enable() {
    indicator = new CpuFreq();
    Main.panel.addToStatusArea('cpufreq', indicator);
}

function disable() {
    indicator.destroy();
    Mainloop.source_remove(event);
    indicator = null;
}
