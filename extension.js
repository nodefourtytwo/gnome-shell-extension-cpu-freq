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

        this.governorchanged=false;

        this.statusLabel = new St.Label({
            text: "--",
            style_class: "cpufreq-label"
        });

        this.cpuFreqInfoPath = this._detectCpuFreqInfo();
        this.cpuFreqSelectorPath = this._detectCpuFreqSelector();

        this._build_ui();
        //update every 5 seconds
        event = GLib.timeout_add_seconds(0, 5, Lang.bind(this, function () {
            this._update_freq();
            this._update_popup();
            return true;
        }));
        
    },

    _detectCpuFreqInfo: function(){
        //detect if cpufreq-info is installed
        let ret = GLib.spawn_command_line_sync("which cpufreq-info");
        if ( (ret[0]) && (ret[3] == 0) ) {//if yes
            return ret[1].toString().split("\n", 1)[0];//find the path of cpufreq-info
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
        
        return governors;
    },

    _update_freq: function() {
        let freqInfo=null;
        if (this.cpuFreqInfoPath){
            let cpufreq_output = GLib.spawn_command_line_sync(this.cpuFreqInfoPath+" -fm");//get the output of the cpufreq-info -fm command
            if(cpufreq_output[0]) freqInfo = cpufreq_output[1].toString().split("\n", 1)[0];
            if (freqInfo){
                this.title=freqInfo;
            }
        }
        this.statusLabel.set_text(this.title);
    },
    
    _update_popup: function() {
        this.menu.removeAll();
    
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
                
                if(this.cpuFreqSelectorPath){
                    governorItem.connect('activate', Lang.bind(this, function() {
                        this.governorchanged=GLib.spawn_command_line_async(this.cpuFreqSelectorPath+" -g "+governorLabel.text);
                    }));
                }
            }
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
