__author__ = 'pieroit'

import MySQLdb
import MySQLdb.cursors
from pymongo import MongoClient

class DatabaseHulk:
    def __init__(self, dbCredentials):

        self.dbType = dbCredentials['dbtype']
        if self.dbType != 'mongo' and self.dbType != 'mysql':
            exit('Database type not supported: ', self.dbType)

        if (self.dbType == 'mongo'):
            self.db = MongoClient()
            self.db = self.db[dbCredentials['dbname']]

        if (self.dbType == 'mysql'):
            self.db = MySQLdb.connect(
                host=dbCredentials['host'],
                user=dbCredentials['user'],
                passwd=dbCredentials['password'],
                db=dbCredentials['dbname'],
                cursorclass=MySQLdb.cursors.SSCursor    # this cursor allows one by one fetching
                # TODO: implement fetching one by one - http://kushaldas.in/posts/fetching-row-by-row-from-mysql-in-python.html
            )

    def createTable( self, newTableName, vars ):

        # drop table if already exists
        self.dropTable(newTableName)

        if (self.dbType == 'mongo'):
            # TODO: mongo create table
            exit('NON HAI SCRITTO IL CODICE PER CREARE LA TABELLA IN MONGO')

        if (self.dbType == 'mysql'):
            query = 'CREATE TABLE ' + newTableName + ' ( '
            for name in vars:
                if not 'type' in vars[name]:
                    vars[name]['type'] = 'text'
                query += str(name) + ' ' + vars[name]['type'] + ', '
            query = query[:-2]  #take away last comma
            query += ');'

            # execute creation
            self.db.cursor().execute( query )

            # save changes
            self.db.commit()

    def cloneTable( self, originTableName, newTableName, empty=False ):

        # drop table if already exists
        self.dropTable(newTableName)

        if (self.dbType == 'mongo'):
            # TODO: mongo clone table
            exit('NON HAI SCRITTO IL CODICE PER CLONARE LA TABELLA IN MONGO')

        if (self.dbType == 'mysql'):
            query = 'CREATE TABLE ' + newTableName + ' LIKE ' + originTableName

            # execute creation
            self.db.cursor().execute( query )

            self.emptyTable(newTableName)

            # save changes
            self.db.commit()

    def dropTable(self, table):

        if (self.dbType == 'mongo'):
            # TODO: mongo drop table
            exit('NON HAI SCRITTO IL CODICE PER CANCELLARE LA TABELLA IN MONGO')

        if (self.dbType == 'mysql'):
            # delete data from table
            query = 'DROP TABLE IF EXISTS ' + table
            self.db.cursor().execute(query)

        self.db.commit()

    def emptyTable(self, table):

        if (self.dbType == 'mongo'):
            # TODO: mongo clean table
            exit('NON HAI SCRITTO IL CODICE PER SVUOTARE LA TABELLA IN MONGO')

        if (self.dbType == 'mysql'):
            # delete data from table
            query = 'TRUNCATE TABLE ' + table
            self.db.cursor().execute(query)

        self.db.commit()

    def insertRecord( self, table, record, commit=True ):

        # extract keys and values
        keys = str( tuple( record.keys() ) )
        values = str( tuple( record.values() ) )

        # take away ' from columns names
        keys = keys.replace("'", '')

        if (self.dbType == 'mysql'):

            # TODO: mysql gives error when there is only one key and value.

            # build and execute query
            query = 'INSERT into ' + table + ' ' + keys + ' VALUES ' + values
            self.db.cursor().execute( query )

            # commit=False is used for fast insertion in myql.
            # in that case using code should call DatabaseHulk.commit() by hand from outside.
            if( commit ):
                self.db.commit()

        if (self.dbType == 'mongo'):
            # TODO: mongo insert record
            exit('NON HAI SCRITTO IL CODICE PER INSERIRE IL RECORD IN MONGO')

    def updateRecord( self, table, newValues, identifiers, commit=True ):

        if (self.dbType == 'mysql'):

            # build and query
            query = 'UPDATE ' + table + ' SET '
            for columnName in newValues:
                query += '`' + columnName + '`="' + str(newValues[columnName])  + '", '

            # take away last ', '
            query = query[:-2]

            query += ' WHERE '
            for columnName in identifiers:
                query += '`' + columnName + '`="' + str(identifiers[columnName]) + '" AND '

            # take away last 'AND'
            query = query[:-4]

            self.db.cursor().execute( query )

            # commit=False is used for fast insertion in myql.
            # in that case using code should call DatabaseHulk.commit() by hand from outside.
            if( commit ):
                self.db.commit()

        if (self.dbType == 'mongo'):
            # TODO: mongo update record
            exit('NON HAI SCRITTO IL CODICE PER AGGIORNARE IL RECORD IN MONGO')

    def commit(self):
        # TODO: is it necessary for mongo?
        self.db.commit()

    def getFromSQL(self, query, getAsDictionary=False):

        # get data from db
        cursor = self.db.cursor()
        cursor.execute(query)
        data = cursor.fetchall()

        # get also column names
        columnNames = []
        for col in cursor.description:
            columnNames.append(col[0])
        cursor.close()

        # clean data (take them away from tuples)
        return self.cleanSQLdata(data, getAsDictionary, columnNames)

    def cleanSQLdata(self, data, getAsDictionary, columnNames):
        cleandata = []
        for row in data:
            if len(row) > 1:

                cleanrow = []
                if getAsDictionary:
                    columnCounter = 0
                    cleanrow = {}   # we need a dict

                for element in row:
                    if getAsDictionary:
                        columnName = columnNames[columnCounter]
                        cleanrow[columnName] = self.convertToIntIfItIsLong(element)
                        columnCounter += 1
                    else:
                        cleanrow.append(self.convertToIntIfItIsLong(element))
            else:
                cleanrow = self.convertToIntIfItIsLong(row[0])
            cleandata.append(cleanrow)

        return cleandata

    def convertToIntIfItIsLong(self, n):
        # TODO: this method will cause issues if the number is actually long
        if type(n) is long:
            return int(n)
        return n

    def getDistinctValues(self, table, variable):
        if (self.dbType == 'mongo'):
            return self.db[table].distinct(variable)

        if (self.dbType == 'mysql'):
            query = 'SELECT DISTINCT `' + variable + '` FROM ' + table
            return self.getFromSQL(query)

    def count(self, table, constraints={}):
        if (self.dbType == 'mongo'):
            return self.db[table].find(constraints).count()

        if (self.dbType == 'mysql'):
            query = 'SELECT COUNT(*) FROM ' + table + ' WHERE'
            for k, v in constraints.items():
                query += ' `' + str(k) + '`="' + str(v) + '" AND'

            # take away last 'AND'
            if constraints != {}:
                query = query[:-4]
            else:
                query = query[:-5]
            print query
            return self.getFromSQL(query)[0]

    def getRecords(self, table, constraints={}):
        if (self.dbType == 'mongo'):
            return self.db[table].find(constraints, timeout=False)
            # TODO: we should close the cursor manually after deactivating the timeout

        if (self.dbType == 'mysql'):
            query = 'SELECT * FROM ' + table + ' WHERE'
            for k, v in constraints.items():
                query += ' `' + str(k) + '`="' + str(v) + '" AND'

            # take away last 'AND'
            query = query[:-4]
            return self.getFromSQL(query, getAsDictionary=True)
