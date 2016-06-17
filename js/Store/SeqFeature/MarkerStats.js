define([
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/_base/lang',
            'dojo/request',
            'JBrowse/Store/SeqFeature',
            'JBrowse/Model/SimpleFeature',
            'JBrowse/Util'
       ],
       function(
            declare,
            array,
            lang,
            request,
            SeqFeatureStore,
            SimpleFeature,
            Util
       ) {

var dojof = Util.dojof;

return declare( SeqFeatureStore, {

    constructor: function( args ) {
        this.intervals=[];

        // "cache results" by default using a naive algorithm that if interval we are requesting is fully contained in interval we already requested, then use cache
        this.optimize = this.config.optimizer === undefined ? true: this.config.optimizer;
        this.refSeqTransform = this.config.refSeqTransform === undefined ? false: this.config.refSeqTransform;
    },
    getFeatures: function( query, featureCallback, finishCallback, errorCallback ) {
        var thisB = this;
        var ref = query.ref;
        if (this.refSeqTransform) {
            ref = ref.match(/chr(\d+)/)[1];
        }
        var url = this.resolveUrl(
            this.config.urlTemplate, { refseq: ref, start: query.start, end: query.end }
        );

        if (this.optimize) {
            var done = false;
            var featureFound = 0;

            array.forEach( this.intervals, function(interval) {
                if( query.start >= interval.start && query.end <= interval.end ) {
                    array.forEach( interval.features, function(feature) {
                        if( !(feature.get('start')>query.end&&feature.get('end')<query.start) ) {
                            featureFound++;
                            featureCallback(feature);
                        }
                    });
                    if( interval.features ) {
                        done = true;
                        return;
                    }
                }
            });

            if( done ) {
                finishCallback();
                return;
            }
        }

        //cache intervals
        var interval = {
            start: query.start,
            end: query.end,
            ref: ref,
            features: []
        };

        request( url, { handleAs: 'json' }).then(
            function( featuredata ) {
                var feats = featuredata.variants||[];
            	array.forEach( feats, function(f) {
            			var feat = thisB.processFeat( f );
            			interval.features.push( feat );
            			featureCallback( feat );
            	});
            	thisB.intervals.push( interval );
            	finishCallback();
                
            },
            errorCallback
       );

    },
    processFeat: function( f ) {
    	//var score = f.PVALUE.toExponential(2)
    	var score = -1*Math.log(f.PVALUE)
        var feature = new SimpleFeature({
                id: f.DBSNP_ID,
                data: {
                    start: f.POS-1,
                    end: f.POS,
                    id: f.DBSNP_ID,
                    score: score
                }
            });

        return feature;
    }


});
});
