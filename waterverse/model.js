let log_index = 0;

function log_message(args, msg, type= 'INFO')
{
    let data = {};
    data['loc'] = window.access_token;
    data['device'] = '';
    data['property'] = '';

    data['mode'] = type;

    try
    {
        data['message'] = args.callee.name.toString() + ' ' + msg;
    }
    catch(e)
    {
        data['message'] = '<no callee> ' + msg;
    }

    if (data['message'].includes('TypeError'))
    {
        alert(arguments,log_index.toString() + ' ' + data['mode'] +':'+data['message']);
    }

    log_index = log_index +1;

}

function alert_message(args, msg)
{
    try
    {
        alert(args.callee.name.toString() + 'Alert:' + msg);
    }
    catch(e)
    {
        alert('Alert:' + msg);
    }
}

class TimeDelta
{
    constructor(sec)
    {
        this.elapsed_seconds = sec;
    }

    total_seconds()
    {
        return this.elapsed_seconds;
    }

    static fromSeconds(sec)
    {
        return new TimeDelta(sec);
    }

    static fromTime(hh,mm,ss)
    {
        return new TimeDelta((((hh * 60) + mm) * 60) + ss);
    }

    static sub(a,b)
    {
        return TimeDelta.fromSeconds(a.total_seconds() - b.total_seconds());
    }

    static add(a,b)
    {
        return TimeDelta.fromSeconds(a.total_seconds() + b.total_seconds());
    }

    toString()
    {

        return this.dd().toString().padStart(3,'0')
            + ':' + this.hh().toString().padStart(2,'0')
            + ':' + this.mm().toString().padStart(2,'0')
            + ':' + this.ss().toString().padStart(2,'0');
    }

    dd()
    {
        return Math.floor((this.total_seconds() / (60 * 60*24)));
    }
    hh()
    {
        return Math.floor((this.total_seconds() / (60 * 60)) % 24);
    }

    mm()
    {
        return Math.floor((this.total_seconds() / 60) % 60);
    }

    ss()
    {
        return Math.floor(this.total_seconds() % 60);
    }
}


class DeviceInstance
{
    constructor(props)
    {
        this.definition = props;
    }

    get_readings(hours_of_readings, readings_per_hour)
    {
        let results = {data:[], type:'scatter'};

        if ('type' in this.definition.data)
        {
            results.type = this.definition.data.type;
        }

        let current_time = TimeDelta.fromTime(0,0,0);
        let time_step = TimeDelta.fromTime(0,(60 / readings_per_hour),0);

        do
        {
            let val = this.get_value(current_time);
            results.data.push([current_time, val]);

            current_time = TimeDelta.add(current_time,time_step);

        }while( current_time.total_seconds() < hours_of_readings.total_seconds());

        return results;
    }

    get_value(current_time)
    {
        let modulated_current_time = current_time;

        let last_index = this.definition['keys'].length - 1;
        let last_step = this.definition['keys'][last_index]['timestep'];

        while(modulated_current_time.total_seconds() > last_step.total_seconds() )
        {
            modulated_current_time = TimeDelta.sub(modulated_current_time, this.definition['keys'][last_index]['timestep']);
        }

        let old_key = this.definition['keys'][0];


        for (const [key, value] of Object.entries(this.definition['keys']))
        {
            let entry = this.definition['keys'][key];

            if (entry['timestep'].total_seconds() <= modulated_current_time.total_seconds() )
            {
                old_key =  this.definition['keys'][key];
            }

            if (entry['timestep'].total_seconds() >= modulated_current_time.total_seconds() )
            {
                let b = TimeDelta.sub(entry['timestep'], old_key['timestep']);
                let a = TimeDelta.sub(modulated_current_time, old_key['timestep']);

                let delta = 0.0;

                if (a.total_seconds() > 0)
                {
                    delta = a.total_seconds() / b.total_seconds();
                }

                let val = old_key['value'] * (1.0 - delta);
                val += entry['value'] * (delta);

                return this.range_result(val);
            }
        }

        console.log('Failed to generate value!');
    }

    range_result(val)
    {
        return (val * (this.definition['data']['max'] - this.definition['data']['min'])) + this.definition['data']['min'];
    }
}



let model_device_list =
[
    //level
    {
        'loc' : [50.479033, -3.761402],
        'name': 'Austins Bridge',
        'controlledProperty' : 'Level',
        'id' : '46122',
        'url' : 'http://environment.data.gov.uk/flood-monitoring/def/core/statusActive',
        'type' : 'device',
    },

    //WQ
    {
        'loc' : [50.46093042864342, -3.713818377511799],
        'name': 'DART_STAVERTON US',
        'id' : 'E202209',
        'controlledProperty' : ['TEMP','COND','PH', 'AMMONIUM','TURBIDITY','DOO_PCENT','DOO_MGL','CHLOROPHYL','BGA-PC'],
        'type' : 'device',
    },

    //WQ
    {
        'loc' : [50.442427, -3.6906442],
        'name': 'DART_LITTLEHEMPSTON',
        'id' : 'E202209',
        'controlledProperty' : ['TEMP','COND','PH', 'AMMONIUM','TURBIDITY','DOO_PCENT','DOO_MGL','CHLOROPHYL','BGA-PC'],
        'type' : 'device',
    },

    //SSO?

    {
        'loc' : [50.461661, -3.6976985],
        'name': 'STAVERTON STW_SSO_STAVERTON',
        'id' : 'E20921',
        'type' : 'sso',
        'controlledProperty' : 'CSOLevel',
    },

    //CSO
    {
        'loc' : [50.447006, -3.7096956],
        'name': 'DARTINGTON SCH TWO_CSO_DARTINGTON',
        'id' : 'E3843',
        'type' : 'cso',
        'controlledProperty' : 'CSOLevel',
    },

    {
        'loc' : [50.446574, -3.7084828],
        'name': 'SHINNERS BRIDGE_CSO_DARTINGTON',
        'id' : 'E18534',
        'type' : 'cso',
        'controlledProperty' : 'CSOLevel',
    },

    {
        'loc' : [50.445465, -3.7043865],
        'name': 'TEXTILE MILL_CSO_DARTINGTON',
        'id' : 'E17964',
        'type' : 'cso',
        'controlledProperty' : 'CSOLevel',
    },

    {
        'loc' : [50.445031, -3.7027089],
        'name': 'DARTINGTON C_CSO_DARTINGTON',
        'id' : 'E18058',
        'type' : 'cso',
        'controlledProperty' : 'CSOLevel',
    },

    //SEO?
    {
        'loc' : [50.438818, -3.6914873],
        'name': 'NORTHERN VILLAGES SPST_PSEO_TOTNES',
        'id' : 'E6438',
        'type' : 'seo',
        'controlledProperty' : 'CSOLevel',
    },

    //Swimming spots
    {
        'loc' : [50.4616840, -3.7121770],
        'name': 'Staverton Weir, River Dart',
        'type' : 'wildswimming',
        'controlledProperty' : 'Swimming',
    },

    {
        'loc' : [50.4600948, -3.7031049],
        'name': 'Still Pool, River Dart, Staverton',
        'type' : 'wildswimming',
        'controlledProperty' : 'Swimming',
    },

    {
        'loc' : [50.4602314, -3.6885995],
        'name': 'River Dart, Dartington Estate pt1',
        'type' : 'wildswimming',
        'controlledProperty' : 'Swimming',
    },

    {
        'loc' : [50.4452454, -3.6906881],
        'name': 'River Dart, Dartington Estate pt2',
        'type' : 'wildswimming',
        'controlledProperty' : 'Swimming',
    },

    {
        'loc' : [50.4394680,-3.6911490],
        'name': 'Totnes Weir',
        'type' : 'wildswimming',
        'controlledProperty' : 'Swimming',
    },

    //rain
    {
        'loc' : [50.478771, -3.761192],
        'name': 'Rainfall at Austins Bridge',
        'controlledProperty' : 'rainfall',
        'type' : 'weather',
    },
];

let ammonium_normal = new DeviceInstance({
    'keys' :
    [
        {'timestep' : TimeDelta.fromTime(0,0,0), 'value' : 0.25},
        {'timestep' : TimeDelta.fromTime(1,0,0), 'value' : 0.25},
    ],

    'data':
    {
        'min': 0, 'max': 1
    }
});

let turbidity_normal = new DeviceInstance({
    'keys' :
    [
        {'timestep' : TimeDelta.fromTime(0,0,0), 'value' : 0.25},
        {'timestep' : TimeDelta.fromTime(1,0,0), 'value' : 0.25},
    ],

    'data':
    {
        'min': 0, 'max': 1
    }
});

let doopcent_normal = new DeviceInstance({
    'keys' :
    [
        {'timestep' : TimeDelta.fromTime(0,0,0), 'value' : 0.25},
        {'timestep' : TimeDelta.fromTime(1,0,0), 'value' : 0.25},
    ],

    'data':
    {
        'min': 0, 'max': 1
    }
});

let cond_normal = new DeviceInstance({
    'keys' :
    [
        {'timestep' : TimeDelta.fromTime(0,0,0), 'value' : 0.25},
        {'timestep' : TimeDelta.fromTime(3,0,0), 'value' : 0.5},
        {'timestep' : TimeDelta.fromTime(6,0,0), 'value' : 0.25},
    ],

    'data':
    {
        'min': 0, 'max': 1
    }
});

let swimming_normal = new DeviceInstance({
    'keys' :
    [
        {'timestep' : TimeDelta.fromTime(0,0,0), 'value' : 1.0},
        {'timestep' : TimeDelta.fromTime(5,0,0), 'value' : 1.0},
        {'timestep' : TimeDelta.fromTime(6,0,0), 'value' : 0.0},
        {'timestep' : TimeDelta.fromTime(18,0,0), 'value' : 0.0},
        {'timestep' : TimeDelta.fromTime(19,0,0), 'value' : 1.0},
        {'timestep' : TimeDelta.fromTime(24,0,0), 'value' : 1.0},
    ],

    'data':
    {
        'min': 0, 'max': 1,
        'type': 'bar',
    }
});

let cso_normal = new DeviceInstance({
    'keys' :
    [
        {'timestep' : TimeDelta.fromTime(0,0,0), 'value' : 1.0},
        {'timestep' : TimeDelta.fromTime(1,0,0), 'value' : 1.0},
    ],

    'data':
    {
        'min': 0, 'max': 1,
    }
});

let river_level_normal = new DeviceInstance({
    'keys' :
    [
        {'timestep' : TimeDelta.fromTime(0,0,0), 'value' : 0.25},
        {'timestep' : TimeDelta.fromTime(1,0,0), 'value' : 0.25},
    ],

    'data':
    {
        'min': 0, 'max': 10,
    }
});

let rainfall_normal = new DeviceInstance({
    'keys' :
    [
        {'timestep' : TimeDelta.fromTime(0,0,0), 'value' : 0.0},
        {'timestep' : TimeDelta.fromTime(1,0,0), 'value' : 0.1},
        {'timestep' : TimeDelta.fromTime(2,0,0), 'value' : 0.5},
        {'timestep' : TimeDelta.fromTime(3,0,0), 'value' : 0.5},
        {'timestep' : TimeDelta.fromTime(4,0,0), 'value' : 0.1},
        {'timestep' : TimeDelta.fromTime(5,0,0), 'value' : 0.1},
        {'timestep' : TimeDelta.fromTime(24,0,0), 'value' : 0.0},
    ],

    'data':
    {
        'min': 0, 'max': 28.0,
        'type': 'bar',
    }
});

let wq_normal = [{name: 'AMMONIUM', data: ammonium_normal },
                        {name: 'TURBIDITY', data: turbidity_normal },
                        {name: 'DOO_PCENT', data: doopcent_normal },
                        {name: 'COND', data: cond_normal },
                    ];



let model_scenario_list =
[
    {
        name: 'normal',
        start_time: '01-01-23T00:00:00',
        duration: TimeDelta.fromTime(24,0,0),
        devices: [
            //river level
            {name: 'Austins Bridge', data: river_level_normal },

            //WQ
            {name: 'DART_STAVERTON US', data: wq_normal },
            {name: 'DART_LITTLEHEMPSTON', data:wq_normal},

            //swimming
            {name: 'Staverton Weir, River Dart', data: swimming_normal},
            {name: 'Still Pool, River Dart, Staverton', data: swimming_normal},
            {name: 'River Dart, Dartington Estate pt1', data: swimming_normal},
            {name: 'River Dart, Dartington Estate pt2', data: swimming_normal},
            {name: 'Totnes Weir', data: swimming_normal},

            //CSO
            {name: 'STAVERTON STW_SSO_STAVERTON', data: cso_normal},
            {name: 'DARTINGTON SCH TWO_CSO_DARTINGTON',data: cso_normal},
            {name: 'SHINNERS BRIDGE_CSO_DARTINGTON',data: cso_normal},
            {name: 'TEXTILE MILL_CSO_DARTINGTON',data: cso_normal},
            {name: 'DARTINGTON C_CSO_DARTINGTON',data: cso_normal},
            {name: 'NORTHERN VILLAGES SPST_PSEO_TOTNES',data: cso_normal},

            //rainfall
            {name: 'Rainfall at Austins Bridge', data: rainfall_normal},
        ],
    }
];
class ScenarioEngine
{
    constructor()
    {
        console.log('');
    }
    get_scenario(name)
    {
        for(let i=0;i< model_scenario_list.length;i++)
        {
            if(name === model_scenario_list[i].name)
            {
                return model_scenario_list[i];
            }
        }

        return undefined;
    }

    get_scenario_list()
    {
        let result = [];

        for(let i=0;i< model_scenario_list.length;i++)
        {
            result.push(model_scenario_list[i].name);
        }

        return result;
    }

    get_sensors(name)
    {
        let scenario = this.get_scenario(name);
        let result = [];
        for(let i=0;i< scenario.devices.length;i++)
        {
            result.push( this.get_sensor(scenario.devices[i].name));
        }

        return result;
    }

    get_sensor(name)
    {
        for(let i=0;i< model_device_list.length;i++)
        {
            if (name == model_device_list[i].name)
            {
                return model_device_list[i];
            }
        }

        return undefined;
    }

    get_sensor_detail(name)
    {
        let sensor = this.get_sensor(name);
        let html = '';

        html +='<b>';
        html += sensor['name'];
        html +='</b>';
        html +='<p style="text-align:center">';
        html += '<br>';
        html += 'Type:'+sensor['type'];
        html += '<br>';

        if ('controlledProperty' in sensor)
        {
            html += '<br><b>Properties</b><br>';

            if (Array.isArray(sensor.controlledProperty))
            {
                for (let i = 0; i < sensor.controlledProperty.length; i++)
                {
                    html += sensor.controlledProperty[i];
                    html += '<br>';
                }
            }
            else
            {
                html += sensor.controlledProperty;
                html += '<br>';
            }
        }

        if('id' in sensor)
        {
            html += '<br>';
            html += 'ID: ' + sensor.id;
            html += '<br>';
        }

        html +='</p>';

        return html;
    }

    get_chart_data(name)
    {
        let scenario = this.get_scenario(name);
        let result = {};

        for(let i=0;i< scenario.devices.length;i++)
        {
            let current_device = scenario.devices[i];

            if( current_device.data instanceof DeviceInstance)
            {
                let sensor = this.get_sensor(current_device.name);
                //simple
                result[current_device.name+'-'+sensor.controlledProperty] = current_device.data.get_readings(scenario.duration, 1);
            }
            else
            {
                for (let j=0;j< current_device.data.length;j++)
                {
                    let actual_device = current_device.data[j];
                    result[current_device.name+'-'+ actual_device.name] = actual_device.data.get_readings(scenario.duration, 1);
                }
            }
        }

        return result;
    }
}