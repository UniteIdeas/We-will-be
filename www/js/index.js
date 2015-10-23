jQuery(document).ready(function($){
    
    // Global vars
    var currentSeriesMinYear;
    var currentSeriesMaxYear;
    var currentSeries;
    var colorScale;
    var animationID;
    var worldGeoJson;
    var svg = d3.select('#map').append('svg');
    
    // AJAX call to load countries topoJson, then draw
    d3.json('world-50m.json', function(err, world){
        worldGeoJson = topojson.feature(world, world.objects.countries);
        drawMap();
    });
    $(window).resize(function() {
        drawMap();
    });
    
    //AJAX call to load series hierarchy
    d3.json('api.php?command=SeriesList', function(err, seriesList){
        
        // build tree from flat dataset
        // structure: GoalName -> TargetName -> SeriesName : SeriesRowId
        var seriesTree = d3.nest()
                .key(function(d){ return d.GoalName.replace(/"/g, ''); })
                .key(function(d){ return d.TargetName.replace(/"/g, ''); })
                .key(function(d){ return d.SeriesName.replace(/"/g, ''); })
                .rollup(function(d){
                    return d[0].SeriesRowId;
                })
                .map(seriesList, d3.map);
        
        // create accordions
        var accordionHTML = '';
        addToAccordionHTML('Millennium Development Goals Indicators', seriesTree);
        $('#accordion').html(accordionHTML);
        $('.sub-accordion').accordion({
            collapsible: true,
            active: false,
            heightStyle: 'content'
        });
        $('#accordion > .sub-accordion').accordion( 'option', 'active', 0 );    // main accordion is already open at startup
        
        // When a leaf in the series tree is clicked, load data for that serie and color the map
        $('.accordion-leaf').click( function(ev){
            
            // Some css styling
            $('.accordion-leaf').removeClass('un-active');
            $(this).addClass('un-active');
            
            // Load series and play it!
            $('#title').text( $(ev.target).text() );
            loadSeries($(ev.target).data('series-id'));
        });
                
        function addToAccordionHTML(key, map){
            var goDeeperInMap = map && (typeof(map) === 'object') && map.size() > 0;
            if( goDeeperInMap ){
                accordionHTML += '<div class="sub-accordion">' + '<div>' + getIconsHTML(key) + key + '</div><div>';
                var sortedKeys = map.keys().sort();
                sortedKeys.forEach( function(k){
                    addToAccordionHTML(k, map.get(k)); // I love recursivity <3
                });
                accordionHTML += '</div></div>';
            } else {
                accordionHTML += '<div class="accordion-leaf" data-series-id="' + map + '">' + getIconsHTML(key) + key + '</div>';
            }
        }
        
        function getIconsHTML(label) {
            var cssIcon = 'fa fa-';
            
            if(labelContains(label, ['Target'])){
                // Do nothig
            } else if(labelContains(label, ['Goal 1']))
                cssIcon += 'cutlery fa-2x icon';
            else if(labelContains(label, ['Goal 2']))
                cssIcon += 'university fa-2x icon';
            else if(labelContains(label, ['Goal 3']))
                cssIcon += 'venus-mars fa-2x icon';
            else if(labelContains(label, ['Goal 4']))
                cssIcon += 'child fa-2x icon';
            else if(labelContains(label, ['Goal 5']))
                cssIcon += 'female fa-2x icon';
            else if(labelContains(label, ['Goal 6']))
                cssIcon += 'heartbeat fa-2x icon';
            else if(labelContains(label, ['Goal 7']))
                cssIcon += 'sun-o fa-2x icon';
            else if(labelContains(label, ['Goal 8']))
                cssIcon += 'balance-scale fa-2x icon';
            else if(labelContains(label, [' men', ' boys']))
                cssIcon += 'mars mini-icon';
            else if(labelContains(label, [' women', ' girls']))
                cssIcon += 'venus mini-icon';
            else if(labelContains(label, [' urban']))
                cssIcon += 'building mini-icon';
            else if(labelContains(label, [' rural']))
                cssIcon += 'building-o mini-icon';
            
            return '<span class="' + cssIcon + '"> </span>';
        }
        
        // checks if a label contains only one in a set of words
        function labelContains(label, substrings){
            var lowercaseLabel = label.toLowerCase();
            var matches = 0;
            for(var i=0; i<substrings.length; i++){
                var lowercaseSubstring = (substrings[i]).toLowerCase();
                if(lowercaseLabel.indexOf( lowercaseSubstring ) !== -1){
                    matches++;
                }
            }            
            return (matches === 1);
        }
    });
    
    function drawMap() {
        var width = $('#map').width();
        var height = $('#map').height();
        
        // Empty map
        svg.selectAll('*').remove();

        // Build main map and projection utilities
        svg.attr('width', width)
            .attr('height', height);
        var worldProjection = d3.geo.equirectangular()
            .scale((width/640)*100)
            .translate([width/2, height/2]);
        var worldPath = d3.geo.path()
            .projection(worldProjection);
    
        // Draw countries shapes
        svg.selectAll('.countries')
            .data(worldGeoJson.features)
            .enter()
            .append('path')
            .on('click', function(e){
                console.log(e);
            })
            .attr('class', 'countries')
            .attr('id', function(d){
                return d.id;
            })
            .attr('d', worldPath)
            .attr('fill', '#eee');
    }
    
    // This function will guess if the series is a positive indicator (i.e. gender equality) or a negative one (i.e. HIV deaths).
    function isPositiveIndicator(serie, seriesId) {
        
        // for some of the series the algorithm below does not work. I treat them like exceptions:
        var exceptions = {
            758: true, 770: true, 757: true, 659: true, 730: true, 782: true, 781: true, 765: true, 805: true, 804: true, 806: true, 645: true, 646: true, 618: true, 751: false, 749: false, 750: false, 567: true, 688: true, 787: true, 713: true, 714: true, 717: true, 652: true, 632: true, 653: true, 639: true  
        };
        if( exceptions[seriesId] !== undefined ){
            return exceptions[seriesId];
        }
        
        var years = [];
        var values = [];
        var valuesDeveloped = [];
        var valuesNonDeveloped = [];
        
        serie.forEach(function(s){
            if( s.Year && s.Value ) {
                if(s.IsDeveloped === '1'){
                    valuesDeveloped.push(+s.Value);
                } else {
                    valuesNonDeveloped.push(+s.Value);
                }
                years.push(+s.Year);
                values.push(+s.Value);
            }
        });
        
        /* Two heuristics:
         * 1) Relation between developed and undeveloped countries:
         *     - if the average value of developed countries is higher, it is probably a positive index.
         *     - if the average value of developed countries is lower, it is probably a negative index.
         * 2) Correlation of values with time:
         *     - if the value is increasing with time, it is probably a positive index.
         *     - if the value is decreasing with time, it is probably a negative index.
         */
        var meanDeveloped = ss.mean(valuesDeveloped);
        var meanUndeveloped = ss.mean(valuesNonDeveloped);
        var pearson = ss.sampleCorrelation(years, values);
        
        return (meanDeveloped > meanUndeveloped) && (pearson > 0);
    }
    
    function loadSeries(seriesId){
        
        // load data and then redraw colors
        d3.json('api.php?command=SeriesData&SeriesRowId=' + seriesId, function(err, serie){

            // Compute min and max values
            var minMaxValue = d3.extent( serie, function(d){
                return +d.Value; 
            });

            // Compute min and max year
            var minMaxYear = d3.extent( serie, function(d){
                return +d.Year; 
            });
            currentSeriesMinYear = minMaxYear[0];
            currentSeriesMaxYear = minMaxYear[1];
            
            // Organize series data in a tree, by country -> year -> values
            currentSeries = d3.nest()
                    .key(function(d){ return d.CountryId; })
                    .key(function(d){ return d.Year; })
                    .rollup(function(d){
                        return +d[0].Value;
                    })
                    .map(serie, d3.map);

            // Build color scale (used to convert series values to colors)
            var colorBounds;
            if( isPositiveIndicator(serie, seriesId) ){
                colorBounds = ['#efe','#0a0']; // light to dark green;
            } else {
                colorBounds = ['#fee','#a00']; // light to dark red;
            }
            colorScale = d3.scale.linear().domain(minMaxValue).range(colorBounds);
            
            // Draw legend
            $('#legend').empty()
                    .append( minMaxValue[0] + ' ' );
            d3.range(minMaxValue[0], minMaxValue[1], Math.abs(minMaxValue[0] - minMaxValue[1])/100)
                    .forEach(function(l){
                        $('#legend').append( $('<span>&nbsp;</span>').css('background-color', colorScale(l)) );
                    });
            $('#legend').append( ' ' + minMaxValue[1] );
            
            // start animation
            $('#timeline').show();
            playAnimation();
        });
    };

    // color the map for a specific year and serie
    function draw(year) {
        
        svg.selectAll('.countries')
                .transition()
                /*.duration(500)*/
                .attr('fill', function(d){
                    
                    // de-color countries of the year is not present in the series
                    if( year < currentSeriesMinYear || year > currentSeriesMaxYear ){
                        return '#eee';
                    }
                    
                    var countryId = d.id;
                    var countrySeries = currentSeries.get(countryId);
                    
                    // If no serie, leave the country gray
                    if(!countrySeries){
                        return '#eee';
                    }
                    
                    // Establish the value to pass at the colorScale
                    var value;
                    
                    if(countrySeries.size() === 1){
                        // If only one value, use it as constant
                        value = countrySeries.values()[0];
                    } else if( countrySeries.get(year) ) {
                        // If value is present for the specific year, just copy it
                        value = countrySeries.get(year);
                    } else {
                        // Missing value: Interpolate between the available years
                        var years = countrySeries.keys();
                        var values = countrySeries.values();
                        var interpolator = d3.scale.linear().domain( years ).range( values );
                        
                        value = interpolator(year);
                    }
                    
                    // Pass the value through the colorScale
                    return colorScale(value);
                });
    }
    
    ///////////////////////////
    // Animation and zooming
    
    // slider
    $( "#slider" ).slider({
        value: 1983,
        min: 1983,
        max: 2015,
        step: 1,
        slide: function( event, ui ) {
            // Color the map with the chosen year for the current series
            draw( +ui.value );
            $( "#year" ).text( ui.value );
        }
    });
    $( "#year" ).text( $( "#slider" ).slider( "value" ) );
    
    // play event
    $('html').not('#play').click(function(){
        stopAnimation(); // if something happens on page, just stop the animation
    });
    $('#play').click(function(e){
        e.stopPropagation();
        if(animationID){
            stopAnimation();
        } else {
            playAnimation();
        }
    });
    function stopAnimation(){
        clearInterval(animationID);
        animationID = null;
        $('#play').removeClass('fa-pause').addClass('fa-play');
    }
    function playAnimation(){
        $('#play').addClass('fa-pause');
        
        // case of start and restart animation
        var year = $('#year').text();
        if(year >= currentSeriesMaxYear || year < currentSeriesMinYear ) {
            // Move the slider to the minimum year found in series
            $( '#slider' ).slider( 'value', currentSeriesMinYear );
            $( "#year" ).text( currentSeriesMinYear );

            // Now refresh colors at the desired year
            draw( currentSeriesMinYear );
        }
        
        animationID = setInterval( function(){
            var year = $('#year').text();
            year = parseInt( year, 10 );
            
            if(year >= currentSeriesMaxYear) {
                stopAnimation();
            } else {
                $( '#slider' ).slider( 'value', year + 1 );
                $('#year').text( year + 1 );
                draw( year + 1 );
            }
        }, 300);
    }
    
    // map zooming
    $('.area-zoom').click(function(e){
        $('.area-zoom').removeClass('un-active');
        $(this).addClass('un-active');
        
        var target = $(e.target);
        var transx = target.data('dx') * svg.attr('width');
        var transy = target.data('dy') * svg.attr('height');
        var scale  = target.data('scale');
        zoomToArea(transx, transy, scale);
    });
    function zoomToArea(translateX, translateY, scale){
        d3.selectAll('.countries')
                .transition()
                .attr('transform', 'translate(' + translateX + ', ' + translateY + ')scale(' + scale + ')');
    }
    
});