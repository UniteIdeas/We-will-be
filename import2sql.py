__author__ = 'pieroit'

from DatabaseHulk import DatabaseHulk
import collections

def parseLine(line):
    # take away newline and split by tab
    return line.rstrip('\r\n').split('\t')

# make dictionary out of the list of names and their values
# order must be the same
def buildRecordObj(cols, vals):
    newObj = {}
    for i, col in enumerate(cols):
        newObj[col] = vals[i]

    return newObj


if __name__ == '__main__':

    # prepare db
    sqlCredentials = {
        'dbtype': 'mysql',
        'host': 'localhost',
        'user': 'root',
        'password': 'root',
        'dbname': 'wsd2015'
    }
    db = DatabaseHulk(sqlCredentials)

    variables = {
        'GoalId': {'type':'int'},
        'GoalName': {'type':'text'},
        'TargetId': {'type':'int'},
        'TargetName': {'type':'text'},
        'IndicatorId': {'type':'int'},
        'IndicatorName': {'type':'text'},
        'IndicatorOrderClause': {'type':'text'},
        'SeriesRowId': {'type':'int'},
        'SeriesName': {'type':'text'},
        'SeriesOrderClause': {'type':'int'},
        'IsMdg': {'type':'int'},
        'LastUpdated': {'type':'text'},
        'CountryId': {'type':'int'},
        'CountryName': {'type':'text'},
        'ISO3Code': {'type':'text'},
        'IsDeveloped': {'type':'int'},
        'MdgRegions': {'type':'text'},
        'isMdgCountry': {'type':'int'},
        'IsFormer': {'type':'int'},
        'IsLDC2014': {'type':'int'},
        'IsLLDC': {'type':'int'},
        'GDPpc2012': {'type':'float'},
        'Population2012': {'type':'int'},
        'Year': {'type':'int'},
        'Value': {'type':'float'},
        'Nature': {'type':'text'},
        'FootnoteId': {'type':'text'},
        'FootnoteText': {'type':'text'}
    }
    db.dropTable('wsd2015')
    db.createTable('wsd2015', variables)

    # open file
    file = open('data/wsd2015.txt')

    # loop over lines
    count = 0
    columnNames = []
    for line in file:

        if count == 0:  #header
            columnNames = parseLine(line)
        else:
            # obtain data record
            recordValues = parseLine(line)

            # create hash
            recordObj = buildRecordObj(columnNames, recordValues)

            # insert into db
            db.insertRecord('wsd2015', recordObj, commit=False)

        count += 1
        if count%10000 == 0:
            print count
            db.commit() # inserting 10000 rows at once for speed

    db.commit() # insert remaining records

