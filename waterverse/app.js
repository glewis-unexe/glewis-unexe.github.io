class Content_base
{
    constructor()
    {
    }

    onInit(root)
    {
        this.root = root;
    }

    mode_select(option_label)
    {
        alert_message(arguments,'Called base mode_select');
    }

    update()
    {
        alert_message(arguments,'Called base update');
    }

    on_get_server_data(cmd)
    {
        alert_message(arguments,'on_get_server_data');
    }
}



class MapWidget extends Content_base
{
    constructor()
    {
        super();

        this.marker_data = [];
        this.marker_lookup = {};
    }

    onInit(map_container_div, map_data)
    {
        super.onInit(map_container_div);

        mapboxgl.accessToken = 'pk.eyJ1IjoiZ2F6dGFzdGljIiwiYSI6ImNrYzA4Y2c4NjFoYnIyeHRicmZuaTgyMGQifQ.fkkbIOCwq4j70CqNeiBGcA';
            this.map = new mapboxgl.Map({
                container: this.root.id,
                // Choose from Mapbox's core styles, or make your own style with Mapbox Studio
                style: 'mapbox://styles/mapbox/outdoors-v12',
                zoom: map_data['zoom'],
                center: map_data['center']
        });

        let map = this.map;

        this.map.on('style.load', () =>
        {
            this.map.addSource('mapbox-dem', {
                'type': 'raster-dem',
                'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
                'tileSize': 512,
                'maxzoom': 14
            });

            // add the DEM source as a terrain layer with exaggerated height
            this.map.setTerrain({'source': 'mapbox-dem', 'exaggeration': 1.5});

            this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');
            this.map.addControl(new mapboxgl.ScaleControl(), 'bottom-right');

            this.do_3d_buildings();

            this.update();
        });

        this.map.on('load', () =>
        {
            this.onLoad();
            this.update();
        });
    }

    do_3d_buildings()
    {
        // Insert the layer beneath any symbol layer.
        const layers = this.map.getStyle().layers;
        const labelLayerId = layers.find(
        (layer) => layer.type === 'symbol' && layer.layout['text-field']
        ).id;

        // The 'building' layer in the Mapbox Streets
        // vector tileset contains building height data
        // from OpenStreetMap.
        this.map.addLayer(
        {
        'id': 'add-3d-buildings',
        'source': 'composite',
        'source-layer': 'building',
        'filter': ['==', 'extrude', 'true'],
        'type': 'fill-extrusion',
        'minzoom': 15,
        'paint': {
        'fill-extrusion-color': '#aaa',

        // Use an 'interpolate' expression to
        // add a smooth transition effect to
        // the buildings as the user zooms in.
        'fill-extrusion-height': [
        'interpolate',
        ['linear'],
        ['zoom'],
        15,
        0,
        15.05,
        ['get', 'height']
        ],
        'fill-extrusion-base': [
        'interpolate',
        ['linear'],
        ['zoom'],
        15,
        0,
        15.05,
        ['get', 'min_height']
        ],
        'fill-extrusion-opacity': 0.6
        }
        },
        labelLayerId
        );
    }

    onLoad()
    {
        this.update_markers(this.marker_data);
    }
    
    update_markers(marker_data)
    {
        this.marker_data = JSON.parse(JSON.stringify(marker_data));
        
        for (const [key, value] of Object.entries(this.marker_lookup))
        {
            this.marker_lookup[key].remove();
        }

        this.marker_lookup = {};

        if ((Object.keys(this.marker_lookup).length === 0) && (Object.keys(marker_data).length > 0))
        {
            //add markers
            for (let index = 0; index < this.marker_data.length; index++)
            {
                let key = this.marker_data[index]['id'];
                let pos = this.marker_data[index]['loc'];
                let col = this.marker_data[index]['colour'];
                let detail = 'no detail';

                if ('detail' in this.marker_data[index])
                {
                    detail = this.marker_data[index]['detail'];
                }

                this.marker_lookup[key] = new mapboxgl.Marker({'color':col})
                    .setLngLat([pos[0], pos[1]])
                    .setPopup(new mapboxgl.Popup({offset: 25, maxWidth: 450}) // add popups
                        .setHTML(detail))
                    .addTo(this.map);
            }
        }
/*
        if (Object.keys(this.marker_lookup).length > 0)
        {
            for (let index = 0; index < marker_data.length; index++)
            {
                let key = marker_data[index]['id'];
                let marker = this.marker_lookup[key];

                let color = marker_data[index]['color'];
                this.set_marker_colour(marker, color);

                marker.getPopup().setHTML(marker_data[index]['detail']);
            }
        }
*/
    }

    set_marker_colour(marker, color)
    {
        let $elem = jQuery(marker.getElement());
        $elem.find('svg g[fill="' + marker._color + '"]').attr('fill', color);
        marker._color = color;
    }

    set_visible(layer_name, is_visible)
    {
        if (is_visible === true)
        {
            this.map.setLayoutProperty(layer_name, 'visibility', 'visible');
        }
        else
        {
            this.map.setLayoutProperty(layer_name, 'visibility', 'none');
        }
    }

    update()
    {
    }
}

class ContextualContent extends Content_base
{
    constructor(app_context)
    {
        super();
        this.app_context = app_context;
    }
}

class AppMapContent extends ContextualContent
{
    constructor(app_context)
    {
        super(app_context);
        this.map_widget = new MapWidget();
    }

    onInit(root)
    {
        super.onInit(root);

        this.content = document.createElement('div');
        this.content.style.width = "100%";
        this.content.style.height = "calc(100vh - 80px)";
        this.content.id = 'mapdiv';
        this.root.appendChild(this.content);

        let sensors = this.app_context.getSensors();

        let markers = [];

        let center = [0,0];

        for (let i = 0; i < sensors.length; i++)
        {
            let entry = sensors[i];
            let col = '#ff0000';

            if (entry['type'] =='wildswimming')
            {
                col = '#00ff00';
            }

            if (entry['type'] =='device')
            {
                col = '#000000';
            }

            if ( ['cso','sso','seo'].includes(entry['type']))
            {
                col = '#0000ff';
            }

            if (entry['type'] =='weather')
            {
                col = '#ff00ff';
            }

            markers.push({'loc':[entry['loc'][1], entry['loc'][0]], 'id':entry['name'], 'detail':this.app_context.get_sensor_detail(entry['name']), 'colour':col});

            center[0] += entry['loc'][0];
            center[1] += entry['loc'][1];
        }

        if (sensors.length > 0)
        {
            center[0] /= sensors.length;
            center[1] /= sensors.length;
        }
        else
        {
            center[0] =  50.429;
            center[1] = -3.68;
        }

        this.map_widget.onInit(this.content, {'zoom':12.75, 'center':[center[1], center[0]]});
        this.map_widget.update_markers(markers);
    }
}

class AppTableContent extends ContextualContent
{
    constructor(app_context)
    {
        super(app_context);
    }
}

class AppChartContent extends ContextualContent
{
    constructor(app_context)
    {
        super(app_context);
    }

    onInit(root)
    {
        super.onInit(root);

        this.content = document.createElement('div');
        this.content.style.width = "100%";
        this.content.style.height = "calc(100vh - 80px)";
        this.content.id = 'plotlydiv';
        this.root.appendChild(this.content);

        let layout = {'title': this.app_context.get_scenario_name(),  autosize:true, 'grid': {'rows': 0, 'columns': 1, 'pattern': 'independent', 'xside':'bottom'}, 'xaxis':{'title': 'x-title', 'dtick':10}, 'yaxis':{'title':'y-title'}};

        var data = [];
        let chart_data = this.app_context.get_chart_data();
        for (const [key, value] of Object.entries(chart_data))
        {
            let trace = {};
            trace['x'] = [];
            trace['y'] = [];
            trace['type'] = value.type;
            trace['name'] = key;
            trace.xaxis = 'x';
            trace.yaxis = 'y';

            if (layout.grid.rows > 0)
            {
                trace.xaxis = 'x' + layout.grid.rows.toString();
                trace.yaxis = 'y' + layout.grid.rows.toString();
            }

            data.push(trace);

            for(let i=0;i< value.data.length;i++)
            {
                trace['x'].push(value.data[i][0].toString());
                trace['y'].push(value.data[i][1].toString());
            }

            layout.grid.rows += 1;
        }

        const resizeObserver = new ResizeObserver(entries => {
          for (let entry of entries) {
            Plotly.Plots.resize(entry.target);
          }
        });

        Plotly.newPlot(this.content.id, data, layout).then( function(gd){resizeObserver.observe(gd);});

        /*
        var trace1 = {
          x: [1, 2, 3],
          y: [4, 5, 6],
          type: 'scatter'
        };

        var trace2 = {
          x: [20, 30, 40],
          y: [50, 60, 70],
          xaxis: 'x2',
          yaxis: 'y2',
          type: 'scatter'
        };

        var trace3 = {
          x: [300, 400, 500],
          y: [600, 700, 800],
          xaxis: 'x3',
          yaxis: 'y3',
          type: 'scatter'
        };

        var trace4 = {
          x: [4000, 5000, 6000],
          y: [7000, 8000, 9000],
          xaxis: 'x4',
          yaxis: 'y4',
          type: 'scatter'
        };

        data = [trace1, trace2, trace3, trace4];

        var layout = {
            title : 'charts',
            grid: {rows: 4, columns: 1, pattern: 'independent'},
            autosize:true,
        };

        const resizeObserver = new ResizeObserver(entries => {
          for (let entry of entries) {
            Plotly.Plots.resize(entry.target);
          }
        });

        Plotly.newPlot(this.content.id, data, layout).then( function(gd){resizeObserver.observe(gd);});
        */
    }
}

class ScenarioControlContent extends ContextualContent
{
    constructor(app_context)
    {
        super(app_context);
    }
}

class base_app extends Content_base
{
    constructor()
    {
        super();
        this.content_root_name = 'modal_content';
        this.root = document.body;
        this.app_content = undefined;
    }

    onInit()
    {
        //create root content

        let local_root_name = 'app_html_base';

        {
            let div = document.getElementById(local_root_name);

            if (div !== null)
            {
                div.remove();
            }
        }

        let c = document.createElement('div');
        c.className = 'flex-container';
        c.id = local_root_name;
        c.style.overflow = 'hidden';
        this.root.appendChild(c);

        let r = document.createElement('div');
        r.className = 'row';
        c.appendChild(r);

        this.app_content = document.createElement('div');
        this.app_content.className = 'col-12';
        this.app_content.id = this.content_root_name;
        //content.style.width = "100%";
        this.app_content.style.height = "100vh";
        //this.app_content.style.backgroundColor = "#00ffff";
        r.appendChild(this.app_content);
    }
}

class app extends base_app
{
    constructor()
    {
        super();
        this.current_mode = undefined;

        this.mode_lookup = {};
        this.mode_lookup['mapview'] = {'display_name': 'Map View', 'mode': new AppMapContent(this)};
        this.mode_lookup['tables'] = {'display_name': 'Table View', 'mode': new AppTableContent(this)};
        this.mode_lookup['charts'] = {'display_name': 'Chart View', 'mode': new AppChartContent(this)};
        this.mode_lookup['scenarios'] = {'display_name': 'Scenario Control', 'mode': new ScenarioControlContent(this)};

        this.scenario_engine = new ScenarioEngine();
        this.current_scenario = this.scenario_engine.get_scenario_list()[0];

    }
    onInit()
    {
        super.onInit();

        this.content_root = document.getElementById('modal_content');

        let nav = document.createElement('nav');
        nav.className = "nav nav-pills nav-justided";
        nav.id = this.mode_select_label;
        this.content_root.appendChild(nav);

        $(nav).hover(function ()
        {
            $(this).css('cursor', 'pointer');
        });

        if (this.mode_lookup)
        {
            let labels = Object.keys(this.mode_lookup);

            for (const [key, value] of Object.entries(this.mode_lookup))
            {
                let a = document.createElement('nav');
                a.className = "nav-item nav-link active";
                a.id = key;
                a.href = "#";
                a.innerHTML = value['display_name'];

                var obj = this;
                a.onclick = function ()
                {
                    obj.mode_select(key);
                };

                nav.appendChild(a);
            }

            //gareth -  add a shim to make some space between the rows of navs
            {
                let div = document.createElement('div');
                div.className = 'row';
                div.style = 'height:20px;';
                this.content_root.appendChild(div);
            }
            if (this.current_mode === undefined)
            {
                let labels = Object.keys(this.mode_lookup);
                this.current_mode = labels[0];
            }

            this.current_mode = 'charts';

            this.mode_select(this.current_mode);
        }
    }

    mode_select(option_label)
    {
        if (option_label !== undefined)
        {
            let elements = document.getElementById(this.mode_select_label).childNodes;

            for (let i = 0; i < elements.length; i++)
            {
                elements[i].className = "nav-item nav-link";

                if (elements[i].id === option_label)
                {
                    elements[i].className += " active";
                }
            }

            let screen_user_content_root = 'screen_user_content_root';
            //do something this active thing
            {
                let container = document.getElementById(screen_user_content_root);

                if (container !== null)
                {
                    container.remove();
                }
            }

            let container = document.createElement('div');
            container.id = screen_user_content_root;
            //gareth document.body.appendChild(container);
            this.content_root.appendChild(container);

            if ((this.mode_lookup) && (option_label in this.mode_lookup))
            {
                this.current_mode = option_label;
                this.mode_lookup[this.current_mode]['mode'].onInit(container, this.data);

            }
        }
    }

    getSensors()
    {
        return this.scenario_engine.get_sensors(this.current_scenario);
    }

    get_sensor_detail(name)
    {
        return this.scenario_engine.get_sensor_detail(name);
    }

    get_chart_data()
    {
        return this.scenario_engine.get_chart_data(this.current_scenario);
    }

    get_scenario_name()
    {
        return 'Scenario: ' + this.current_scenario;
    }
}


function app_init()
{
    //data is mode options
    window.app = new app();
    window.app.onInit();
}